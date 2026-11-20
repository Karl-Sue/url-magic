import logging
from datetime import UTC, datetime
from typing import Any, Optional, Self, cast

from azure.cosmos.aio import CosmosClient as AsyncCosmosClient
from azure.cosmos.exceptions import (
    CosmosResourceExistsError,
    CosmosResourceNotFoundError,
)

from core.config import settings
from core.middleware import UrlSecurityMiddleware
from db.redis import RedisRepository
from services.url_shortener import Base62Encoder, URLShortener

logger = logging.getLogger(__name__)


class CosmosConnectionManager:
    """
    Singleton connection manager for Azure Cosmos DB.

    Uses Gateway Connection Mode (HTTP/HTTPS REST calls) suitable for serverless / Azure Functions
    environments, reusing HTTP connection pools efficiently.
    Initializes container and database handles once outside execution loops.
    """

    _instance: Optional["CosmosConnectionManager"] = None
    endpoint: str = ""
    key: str = ""
    database_name: str = ""
    container_name: str = ""
    analytics_container_name: str = ""
    _client: AsyncCosmosClient | None = None
    _container: Any = None
    _analytics_container: Any = None

    def __new__(
        cls,
        endpoint: str | None = None,
        key: str | None = None,
        database_name: str | None = None,
        container_name: str | None = None,
        analytics_container_name: str | None = None,
    ) -> Self:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.endpoint = endpoint or settings.cosmos_endpoint
            cls._instance.key = key or settings.cosmos_key
            cls._instance.database_name = database_name or settings.cosmos_database
            cls._instance.container_name = container_name or settings.cosmos_container
            cls._instance.analytics_container_name = (
                analytics_container_name or settings.cosmos_analytics_container
            )
            cls._instance._client = None
            cls._instance._container = None
            cls._instance._analytics_container = None
        return cast(Self, cls._instance)

    async def get_container(self) -> Any:
        """
        Returns cached container reference, initializing client and container if required.
        """
        if self._container is None:
            if not self._client:
                # Disable SSL verification and endpoint discovery when targeting local Cosmos DB emulator
                connection_verify = not (
                    "localhost" in self.endpoint or "127.0.0.1" in self.endpoint
                )
                self._client = AsyncCosmosClient(
                    self.endpoint,
                    credential=self.key,
                    connection_verify=connection_verify,
                    enable_endpoint_discovery=False,
                )

            db = await self._client.create_database_if_not_exists(id=self.database_name)
            from azure.cosmos import PartitionKey

            self._container = await db.create_container_if_not_exists(
                id=self.container_name,
                partition_key=PartitionKey(path="/shortCode"),
            )
        return self._container

    async def get_analytics_container(self) -> Any:
        """Returns cached analytics container reference, creating if required.

        Partition key is /short_code per analytics spec.
        """
        if self._analytics_container is None:
            if not self._client:
                connection_verify = not (
                    "localhost" in self.endpoint or "127.0.0.1" in self.endpoint
                )
                self._client = AsyncCosmosClient(
                    self.endpoint,
                    credential=self.key,
                    connection_verify=connection_verify,
                    enable_endpoint_discovery=False,
                )

            db = await self._client.create_database_if_not_exists(id=self.database_name)
            from azure.cosmos import PartitionKey

            self._analytics_container = await db.create_container_if_not_exists(
                id=self.analytics_container_name,
                partition_key=PartitionKey(path="/short_code"),
            )
        return self._analytics_container

    async def close(self) -> None:
        """
        Gracefully close client connection pools.
        """
        if self._client:
            await self._client.close()
            self._client = None
            self._container = None
            self._analytics_container = None


class URLQueryRepository:
    """
    Query abstraction layer for base62 shortCode operations on Cosmos DB with Redis caching.
    """

    def __init__(
        self,
        connection_manager: CosmosConnectionManager | None = None,
        redis_repo: RedisRepository | None = None,
        url_shortener: URLShortener | None = None,
        security_middleware: UrlSecurityMiddleware | None = None,
    ):
        self.connection_manager = connection_manager or CosmosConnectionManager()
        self.redis_repo = redis_repo or RedisRepository()
        self.url_shortener = url_shortener or URLShortener()
        self.security_middleware = security_middleware or UrlSecurityMiddleware(
            redis_repo=self.redis_repo,
        )

    async def read_record(self, short_code: str) -> dict[str, Any] | None:
        """
        Finds the record at the fastest speed.
        First queries Redis cache; falls back to Cosmos DB read_item using point read (partition key = shortCode).
        Populates Redis on cache miss.
        """
        # 1. Check Redis Cache
        cached_record = await self.redis_repo.get_url(short_code)
        if cached_record:
            return cached_record

        # 2. Point read on Cosmos DB (Fastest read mode in Cosmos DB)
        try:
            container = await self.connection_manager.get_container()
            doc = await container.read_item(item=short_code, partition_key=short_code)

            # Cache result in Redis (default TTL set to document's TTL if positive or 3600s)
            ttl = doc.get("ttl", 3600)
            await self.redis_repo.set_url(short_code, doc, ttl=ttl)
            return cast(dict[str, Any], doc)
        except CosmosResourceNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Error reading record for shortCode {short_code}: {e}")
            raise

    async def create_record(
        self,
        original_url: str,
        creator_id: str,
        ttl: int = 31536000,
        max_attempts: int = 5,
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        """
        Creates a short URL record.
        Checks/handles duplicates before writing to Cosmos.
        If a collision occurs on shortCode (CosmosResourceExistsError),
        re-hashes/encodes with Base62Encoder until unique or max_attempts reached.
        """
        await self.security_middleware.validate_url(
            original_url,
            creator_id=creator_id,
            client_ip=client_ip,
        )

        container = await self.connection_manager.get_container()

        # Initial shortcode from shortener
        short_code = self.url_shortener.generate_short_code()

        for attempt in range(max_attempts):
            now_iso = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
            document = {
                "id": short_code,
                "shortCode": short_code,
                "originalUrl": original_url,
                "creatorId": creator_id,
                "createdAt": now_iso,
                "ttl": ttl,
                "clickCount": 0,
            }

            try:
                created_doc = await container.create_item(body=document)
                # Cache in Redis immediately upon creation
                await self.redis_repo.set_url(short_code, created_doc, ttl=ttl)
                return cast(dict[str, Any], created_doc)
            except CosmosResourceExistsError:
                logger.warning(
                    f"Collision detected for shortCode '{short_code}'. Re-hashing/encoding attempt {attempt + 1}."
                )
                # Re-hash/encode again using Base62Encoder with modified numeric seed
                curr_numeric = Base62Encoder.decode(short_code)
                # Increment numeric value & encode again
                short_code = Base62Encoder.encode(curr_numeric + 1, min_length=6)

        raise RuntimeError(
            f"Failed to generate a unique shortCode after {max_attempts} attempts due to collisions."
        )

    async def delete_record(self, short_code: str) -> bool:
        """
        Deletes a record manually.
        Cosmos DB also automatically handles expired records once TTL passes.
        Also clears from Redis cache.
        """
        # Clear cache first
        await self.redis_repo.delete_url(short_code)

        try:
            container = await self.connection_manager.get_container()
            await container.delete_item(item=short_code, partition_key=short_code)
            return True
        except CosmosResourceNotFoundError:
            return False
        except Exception as e:
            logger.error(f"Error deleting record for shortCode {short_code}: {e}")
            raise

    async def update_record(self, *args: Any, **kwargs: Any) -> None:
        """
        Updates are explicitly not allowed for short URL records.
        """
        raise NotImplementedError("Updating URL shortener records is not allowed.")


class AnalyticsRepository:
    """Repository abstraction for short_code click analytics in Cosmos DB."""

    def __init__(
        self,
        connection_manager: CosmosConnectionManager | None = None,
    ):
        self.connection_manager = connection_manager or CosmosConnectionManager()

    async def save_click_event(self, event_data: dict[str, Any]) -> dict[str, Any]:
        """Persists a click event document idempotently to the analytics container."""
        container = await self.connection_manager.get_analytics_container()
        doc = dict(event_data)
        if "id" not in doc and "event_id" in doc:
            doc["id"] = doc["event_id"]

        try:
            result = await container.create_item(body=doc)
            return cast(dict[str, Any], result)
        except CosmosResourceExistsError:
            logger.info(f"Duplicate click event '{doc.get('id')}' already exists, skipping.")
            return doc

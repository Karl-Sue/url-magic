import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)

class RedisClient:
    """
    Singleton connection manager for Redis.
    Reuses connection pool across requests.
    """
    _instance: Optional["RedisClient"] = None
    _client: redis.Redis | None = None

    def __new__(cls, url: str = "redis://localhost:6379"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._url = url
        return cls._instance

    async def get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.Redis.from_url(
                self._url,
                decode_responses=True
            )
        return self._client

    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None


class RedisRepository:
    """
    Abstraction layer for caching URL documents in Redis.
    """
    def __init__(self, redis_client: redis.Redis | None = None, url: str = "redis://localhost:6379"):
        self._redis_client_wrapper = RedisClient(url)
        self._redis = redis_client

    async def _get_redis(self) -> redis.Redis:
        if self._redis is None:
            self._redis = await self._redis_client_wrapper.get_client()
        return self._redis

    async def get_url(self, short_code: str) -> dict[str, Any] | None:
        try:
            client = await self._get_redis()
            data = await client.get(f"url:{short_code}")
            if data:
                return json.loads(data)
        except redis.RedisError as e:
            logger.warning(f"Redis get failed for {short_code}: {e}")
        return None

    async def set_url(self, short_code: str, document: dict[str, Any], ttl: int = 3600):
        try:
            client = await self._get_redis()
            serialized = json.dumps(document)
            if ttl > 0:
                await client.setex(f"url:{short_code}", ttl, serialized)
            elif ttl == -1:
                await client.set(f"url:{short_code}", serialized)
        except redis.RedisError as e:
            logger.warning(f"Redis set failed for {short_code}: {e}")

    async def delete_url(self, short_code: str):
        try:
            client = await self._get_redis()
            await client.delete(f"url:{short_code}")
        except redis.RedisError as e:
            logger.warning(f"Redis delete failed for {short_code}: {e}")

    async def increment_counter(self, key: str, ttl: int) -> int:
        try:
            client = await self._get_redis()
            value = await client.incr(key)
            if value == 1:
                await client.expire(key, ttl)
            return value
        except redis.RedisError as e:
            logger.warning(f"Redis rate-limit counter failed for {key}: {e}")
            raise
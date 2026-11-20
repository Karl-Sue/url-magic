import json
import logging
from typing import Any, Self, cast

from azure.core.exceptions import AzureError
from azure.storage.queue import TextBase64EncodePolicy
from azure.storage.queue.aio import QueueClient

from core.config import settings

logger = logging.getLogger(__name__)


class QueueService:
    _instance: "QueueService | None" = None
    _client: QueueClient | None = None

    def __new__(cls) -> Self:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cast(Self, cls._instance)

    def _get_client(self) -> QueueClient:
        if self._client is None:
            self._client = QueueClient.from_connection_string(
                conn_str=settings.queue_connection_string,
                queue_name=settings.queue_name,
                message_encode_policy=TextBase64EncodePolicy(),
            )
        return self._client

    async def enqueue_click(self, event_data: dict[str, Any]) -> bool:
        """Asynchronously enqueues a click event into Azure Storage Queue.

        Gracefully degrades without raising exceptions to protect redirect performance.
        """
        try:
            client = self._get_client()
            message = json.dumps(event_data)
            await client.send_message(message)
            return True
        except AzureError as exc:
            # Auto-create queue if not present yet in Azurite/local dev
            if getattr(
                exc, "error_code", None
            ) == "QueueNotFound" or "QueueNotFound" in str(exc):
                try:
                    await client.create_queue()
                    await client.send_message(message)
                    return True
                except AzureError as create_exc:
                    logger.warning(
                        f"Failed to auto-create queue and send: {create_exc}"
                    )
            logger.warning(
                f"Failed to enqueue click for {event_data.get('short_code')}: {exc}"
            )
            return False
        except Exception:
            logger.exception("Unexpected error enqueuing click")
            return False

    async def close(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None


queue_service = QueueService()

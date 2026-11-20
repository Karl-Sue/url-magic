import json
import logging
from typing import Any

from db.cosmos_client import AnalyticsRepository
from schemas.analytics import ClickEvent

logger = logging.getLogger(__name__)


async def handle_click_event_message(
    body_str: str,
    repo: AnalyticsRepository | None = None,
) -> dict[str, Any]:
    """Parses and persists a raw queue click event to Cosmos DB."""
    data = json.loads(body_str)
    event = ClickEvent(**data)
    repo = repo or AnalyticsRepository()
    saved = await repo.save_click_event(event.model_dump())
    logger.info(
        f"Persisted click event {event.event_id} for short_code '{event.short_code}'"
    )
    return saved

import json
from unittest.mock import AsyncMock

import pytest

from functions.analytics_consumer import handle_click_event_message


@pytest.mark.asyncio
async def test_handle_click_event_message_success() -> None:
    payload = {
        "event_id": "evt-abc-123",
        "short_code": "code12",
        "timestamp": "2026-11-20T12:00:00Z",
        "country": "US",
        "referrer": "https://google.com",
        "device": "Desktop",
    }
    body_str = json.dumps(payload)

    mock_repo = AsyncMock()
    mock_repo.save_click_event = AsyncMock(return_value={"id": "evt-abc-123", **payload})

    result = await handle_click_event_message(body_str, repo=mock_repo)
    assert result["id"] == "evt-abc-123"
    assert result["short_code"] == "code12"
    mock_repo.save_click_event.assert_awaited_once_with(payload)


@pytest.mark.asyncio
async def test_handle_click_event_message_invalid_payload() -> None:
    invalid_body = json.dumps({"invalid": "data"})
    mock_repo = AsyncMock()

    with pytest.raises(Exception):
        await handle_click_event_message(invalid_body, repo=mock_repo)
    mock_repo.save_click_event.assert_not_awaited()


@pytest.mark.asyncio
async def test_save_click_event_idempotency_skips_existing() -> None:
    from azure.cosmos.exceptions import CosmosResourceExistsError

    from db.cosmos_client import AnalyticsRepository

    mock_container = AsyncMock()
    mock_container.create_item = AsyncMock(side_effect=CosmosResourceExistsError)
    mock_cm = AsyncMock()
    mock_cm.get_analytics_container = AsyncMock(return_value=mock_container)

    repo = AnalyticsRepository(connection_manager=mock_cm)
    result = await repo.save_click_event({"event_id": "duplicate-id", "short_code": "abc"})

    assert result["id"] == "duplicate-id"
    mock_container.create_item.assert_awaited_once()

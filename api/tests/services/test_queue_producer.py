import pytest
from unittest.mock import AsyncMock, patch

from schemas.analytics import ClickEvent
from services.queue_service import QueueService


def test_click_event_schema() -> None:
    event = ClickEvent(
        event_id="evt-123",
        short_code="abc12",
        timestamp="2026-11-20T12:00:00Z",
        country="US",
        referrer="https://google.com",
        device="Mobile",
    )
    dumped = event.model_dump()
    assert dumped["event_id"] == "evt-123"
    assert dumped["short_code"] == "abc12"
    assert dumped["device"] == "Mobile"


@pytest.mark.asyncio
async def test_enqueue_click_success() -> None:
    svc = QueueService()
    mock_client = AsyncMock()
    mock_client.send_message = AsyncMock()

    with patch.object(svc, "_get_client", return_value=mock_client):
        success = await svc.enqueue_click({"short_code": "abc12"})
        assert success is True
        mock_client.send_message.assert_awaited_once()


@pytest.mark.asyncio
async def test_enqueue_click_failure_does_not_raise() -> None:
    svc = QueueService()
    mock_client = AsyncMock()
    mock_client.send_message = AsyncMock(side_effect=Exception("Connection refused"))

    with patch.object(svc, "_get_client", return_value=mock_client):
        success = await svc.enqueue_click({"short_code": "abc12"})
        assert success is False

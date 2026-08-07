from unittest.mock import AsyncMock

import pytest
from azure.cosmos.exceptions import (
    CosmosResourceExistsError,
)

from db.cosmos_client import URLQueryRepository


@pytest.mark.asyncio
async def test_read_record_cache_hit():
    mock_redis = AsyncMock()
    mock_redis.get_url.return_value = {
        "id": "aX9zQ1",
        "shortCode": "aX9zQ1",
        "originalUrl": "https://example.com",
        "creatorId": "anon_123",
        "createdAt": "2026-08-07T12:27:16Z",
        "ttl": 31536000,
        "clickCount": 0
    }
    
    repo = URLQueryRepository(redis_repo=mock_redis)
    res = await repo.read_record("aX9zQ1")

    assert res["shortCode"] == "aX9zQ1"
    mock_redis.get_url.assert_called_once_with("aX9zQ1")


@pytest.mark.asyncio
async def test_read_record_cache_miss_cosmos_hit():
    mock_redis = AsyncMock()
    mock_redis.get_url.return_value = None

    mock_container = AsyncMock()
    doc = {
        "id": "aX9zQ1",
        "shortCode": "aX9zQ1",
        "originalUrl": "https://example.com",
        "creatorId": "anon_123",
        "createdAt": "2026-08-07T12:27:16Z",
        "ttl": 31536000,
        "clickCount": 0
    }
    mock_container.read_item.return_value = doc

    mock_conn = AsyncMock()
    mock_conn.get_container.return_value = mock_container

    repo = URLQueryRepository(connection_manager=mock_conn, redis_repo=mock_redis)
    res = await repo.read_record("aX9zQ1")

    assert res["shortCode"] == "aX9zQ1"
    mock_container.read_item.assert_called_once_with(item="aX9zQ1", partition_key="aX9zQ1")
    mock_redis.set_url.assert_called_once_with("aX9zQ1", doc, ttl=31536000)


@pytest.mark.asyncio
async def test_create_record_duplicate_retry():
    mock_redis = AsyncMock()
    mock_container = AsyncMock()

    # First attempt raises CosmosResourceExistsError (collision), second attempt succeeds
    created_doc = {
        "id": "rehashed_id",
        "shortCode": "rehashed_id",
        "originalUrl": "https://example.com",
        "creatorId": "anon_123",
        "createdAt": "2026-08-07T12:27:16Z",
        "ttl": 31536000,
        "clickCount": 0
    }
    mock_container.create_item.side_effect = [CosmosResourceExistsError(), created_doc]

    mock_conn = AsyncMock()
    mock_conn.get_container.return_value = mock_container

    repo = URLQueryRepository(connection_manager=mock_conn, redis_repo=mock_redis)
    res = await repo.create_record(original_url="https://example.com", creator_id="anon_123")

    assert mock_container.create_item.call_count == 2
    assert res == created_doc


@pytest.mark.asyncio
async def test_update_record_not_allowed():
    repo = URLQueryRepository()
    with pytest.raises(NotImplementedError):
        await repo.update_record()

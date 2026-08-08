from unittest.mock import AsyncMock

import pytest

from core.middleware import (
    BlockedUrlError,
    RateLimitExceededError,
    UrlSecurityMiddleware,
)


@pytest.mark.asyncio
async def test_blocks_private_ip_url():
    middleware = UrlSecurityMiddleware(
        redis_repo=AsyncMock(),
        reputation_checker=AsyncMock(),
        rate_limiter=AsyncMock(),
    )

    with pytest.raises(BlockedUrlError):
        await middleware.validate_url("http://127.0.0.1/internal", creator_id="user-1")


@pytest.mark.asyncio
async def test_blocks_rate_limited_user():
    rate_limiter = AsyncMock()
    rate_limiter.increment.return_value = 11
    reputation_checker = AsyncMock()
    reputation_checker.is_safe.return_value = True

    middleware = UrlSecurityMiddleware(
        redis_repo=AsyncMock(),
        rate_limit_count=10,
        rate_limit_window_seconds=300,
        reputation_checker=reputation_checker,
        rate_limiter=rate_limiter,
    )

    with pytest.raises(RateLimitExceededError):
        await middleware.validate_url("https://example.com", creator_id="user-1", client_ip="8.8.8.8")


@pytest.mark.asyncio
async def test_allows_safe_url():
    rate_limiter = AsyncMock()
    rate_limiter.increment.return_value = 1
    reputation_checker = AsyncMock()
    reputation_checker.is_safe.return_value = True

    middleware = UrlSecurityMiddleware(
        redis_repo=AsyncMock(),
        reputation_checker=reputation_checker,
        rate_limiter=rate_limiter,
    )

    await middleware.validate_url("https://example.com", creator_id="user-1", client_ip="8.8.8.8")

    rate_limiter.increment.assert_any_await("rate-limit:url-create:ip:8.8.8.8", 300)
    rate_limiter.increment.assert_any_await("rate-limit:url-create:user:user-1", 300)
from unittest.mock import AsyncMock

import pytest

from core.config import settings
from core.middleware import (
    BlockedUrlError,
    GoogleSafeBrowsingChecker,
    GoogleSafeBrowsingConfig,
    RateLimitExceededError,
    UrlSecurityMiddleware,
)

# ---------------------------------------------------------------------------
# SSRF & Security Middleware Tests
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Google Safe Browsing Integration Tests (5 Real Threat Cases)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_safe_browsing_allows_clean_url():
    """Test 1: Clean/safe URLs return True."""
    checker = GoogleSafeBrowsingChecker(GoogleSafeBrowsingConfig(api_key=settings.safe_browsing))
    is_safe = await checker.is_safe("https://example.com")
    assert is_safe is True


@pytest.mark.asyncio
async def test_safe_browsing_detects_malware_url():
    """Test 2: Real Google Safe Browsing test URL for MALWARE returns False."""
    checker = GoogleSafeBrowsingChecker(GoogleSafeBrowsingConfig(api_key=settings.safe_browsing))
    is_safe = await checker.is_safe("http://testsafebrowsing.appspot.com/s/malware.html")
    assert is_safe is False


@pytest.mark.asyncio
async def test_safe_browsing_detects_phishing_url():
    """Test 3: Real Google Safe Browsing test URL for SOCIAL_ENGINEERING (phishing) returns False."""
    checker = GoogleSafeBrowsingChecker(GoogleSafeBrowsingConfig(api_key=settings.safe_browsing))
    is_safe = await checker.is_safe("http://testsafebrowsing.appspot.com/s/phishing.html")
    assert is_safe is False


@pytest.mark.asyncio
async def test_safe_browsing_detects_unwanted_software_url():
    """Test 4: Real Google Safe Browsing test URL for UNWANTED_SOFTWARE returns False."""
    checker = GoogleSafeBrowsingChecker(GoogleSafeBrowsingConfig(api_key=settings.safe_browsing))
    is_safe = await checker.is_safe("http://testsafebrowsing.appspot.com/s/unwanted.html")
    assert is_safe is False


@pytest.mark.asyncio
async def test_safe_browsing_allows_when_api_key_missing():
    """Test 5: Fallback behavior when API key is not configured."""
    checker = GoogleSafeBrowsingChecker(GoogleSafeBrowsingConfig(api_key=""))
    is_safe = await checker.is_safe("http://testsafebrowsing.appspot.com/s/malware.html")
    assert is_safe is True

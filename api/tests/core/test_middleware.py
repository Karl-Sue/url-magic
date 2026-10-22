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


@pytest.mark.asyncio
async def test_safe_browsing_uses_redis_cache():
    """Test 6: Safe Browsing checks Redis before calling Google API."""
    from unittest.mock import AsyncMock, patch

    mock_redis = AsyncMock()
    mock_redis.get_safety_status.return_value = True  # Cache HIT: safe

    checker = GoogleSafeBrowsingChecker(
        GoogleSafeBrowsingConfig(api_key="fake-key"),
        redis_repo=mock_redis,
    )

    with patch.object(checker, "_is_safe_sync") as mock_api:
        is_safe = await checker.is_safe("https://example.com/cached-url")
        assert is_safe is True
        mock_api.assert_not_called()  # Google API was avoided!


# ---------------------------------------------------------------------------
# IDN Homograph & RFC Hostname Security Tests
# ---------------------------------------------------------------------------


@pytest.fixture
def security_middleware():
    rate_limiter = AsyncMock()
    rate_limiter.increment.return_value = 1
    reputation_checker = AsyncMock()
    reputation_checker.is_safe.return_value = True

    return UrlSecurityMiddleware(
        redis_repo=AsyncMock(),
        reputation_checker=reputation_checker,
        rate_limiter=rate_limiter,
    )


@pytest.mark.asyncio
async def test_blocks_mixed_script_google_homograph(security_middleware):
    """Famous Attack 1: 'gооgle.com' with Cyrillic small 'о' (U+043E) replacing Latin 'o'."""
    mixed_google = "https://g\u043e\u043egle.com"

    with pytest.raises(BlockedUrlError, match="IDN Homograph attack detected: mixed scripts"):
        await security_middleware.validate_url(mixed_google, creator_id="attacker")


@pytest.mark.asyncio
async def test_blocks_mixed_script_paypal_homograph(security_middleware):
    """Famous Attack 2: 'pаypal.com' with Cyrillic small 'а' (U+0430) replacing Latin 'a'."""
    mixed_paypal = "https://p\u0430ypal.com"

    with pytest.raises(BlockedUrlError, match="IDN Homograph attack detected: mixed scripts"):
        await security_middleware.validate_url(mixed_paypal, creator_id="attacker")


@pytest.mark.asyncio
async def test_blocks_zheng_apple_whole_script_homograph(security_middleware):
    """Famous Attack 3: Xudong Zheng's 2017 attack 'аррӏе.com' (all-Cyrillic mimicking Latin 'apple')."""
    # \u0430 = Cyrillic а, \u0440 = Cyrillic р, \u044f = Cyrillic я or \u04cf = Cyrillic palochka ӏ, \u0435 = Cyrillic е
    zheng_apple = "https://\u0430\u0440\u0440\u04cf\u0435.com"

    with pytest.raises(BlockedUrlError, match="IDN Homograph attack detected: label '.*' contains visual duplicate"):
        await security_middleware.validate_url(zheng_apple, creator_id="attacker")


@pytest.mark.asyncio
async def test_blocks_punycode_encoded_homograph(security_middleware):
    """Famous Attack 4: Zheng's Apple submitted already converted to raw Punycode (xn--80ak6aa92e.com)."""
    punycode_apple = "https://xn--80ak6aa92e.com"

    with pytest.raises(BlockedUrlError, match="IDN Homograph attack detected"):
        await security_middleware.validate_url(punycode_apple, creator_id="attacker")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "invalid_url, expected_error",
    [
        ("https://-leading-hyphen.com", "cannot start or end with a hyphen"),
        ("https://trailing-hyphen-.com", "cannot start or end with a hyphen"),
        ("https://singlelabel", "must contain at least a domain name and a TLD"),
        (f"https://{'a' * 64}.com", "label empty or too long"),
        (f"https://{'a.' * 130}com", "exceeds maximum RFC length of 253 characters"),
    ],
)
async def test_blocks_rfc_hostname_violations(security_middleware, invalid_url, expected_error):
    """RFC structural verification: labels <= 63 chars, host <= 253 chars, hyphen rules."""
    with pytest.raises(BlockedUrlError, match=expected_error):
        await security_middleware.validate_url(invalid_url, creator_id="attacker")


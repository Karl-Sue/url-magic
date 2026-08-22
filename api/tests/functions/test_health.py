import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import httpx2
import pytest
from pydantic import HttpUrl

from functions.health import check_single_url_health, check_urls_health


@pytest.mark.asyncio
async def test_check_single_url_healthy_real_world():
    """Test a healthy, live web service (Google)."""
    mock_checker = AsyncMock()
    mock_checker.is_safe.return_value = True

    mock_response = MagicMock()
    mock_response.is_success = True
    mock_response.status_code = 200

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response

    url = HttpUrl("https://www.google.com")
    result = await check_single_url_health(url, mock_checker, mock_client)

    assert result.status == "healthy"
    assert result.status_code == 200
    assert result.latency_ms is not None
    assert result.latency_ms > 0
    assert result.error is None


@pytest.mark.asyncio
async def test_check_single_url_unhealthy_status_real_world():
    """Test a real-world URL returning HTTP 404 (Httpbin status endpoint)."""
    mock_checker = AsyncMock()
    mock_checker.is_safe.return_value = True

    mock_response = MagicMock()
    mock_response.is_success = False
    mock_response.status_code = 404

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response

    url = HttpUrl("https://httpbin.org/status/404")
    result = await check_single_url_health(url, mock_checker, mock_client)

    assert result.status == "unhealthy"
    assert result.status_code == 404
    assert result.error is None


@pytest.mark.asyncio
async def test_check_single_url_flagged_unsafe_real_world():
    """Test Google Safe Browsing test malware URL."""
    mock_checker = AsyncMock()
    mock_checker.is_safe.return_value = False

    mock_client = AsyncMock()

    url = HttpUrl("https://testsafebrowsing.appspot.com/s/malware.html")
    result = await check_single_url_health(url, mock_checker, mock_client)

    assert result.status == "unsafe"
    assert result.error == "URL flagged by Google Safe Browsing"
    mock_client.get.assert_not_called()


@pytest.mark.asyncio
async def test_check_single_url_timeout_real_world():
    """Test timing out on a slow endpoint (Httpbin delay)."""
    mock_checker = AsyncMock()
    mock_checker.is_safe.return_value = True

    mock_client = AsyncMock()
    mock_client.get.side_effect = httpx2.TimeoutException("Timed out")

    url = HttpUrl("https://httpbin.org/delay/10")
    result = await check_single_url_health(url, mock_checker, mock_client)

    assert result.status == "timeout"
    assert result.latency_ms is not None
    assert "Request timed out" in result.error


@pytest.mark.asyncio
async def test_check_single_url_unreachable_real_world():
    """Test DNS failure on an invalid domain."""
    mock_checker = AsyncMock()
    mock_checker.is_safe.return_value = True

    mock_client = AsyncMock()
    mock_client.get.side_effect = httpx2.RequestError("DNS resolution error", request=MagicMock())

    url = HttpUrl("https://invalid-domain-does-not-exist-999.com")
    result = await check_single_url_health(url, mock_checker, mock_client)

    assert result.status == "unreachable"
    assert "Connection failed" in result.error


@pytest.mark.asyncio
async def test_check_urls_health_concurrency_non_blocking():
    """Verify that check_urls_health executes requests concurrently without blocking fast URLs or crashing on errors."""
    mock_checker = AsyncMock()
    mock_checker.is_safe.return_value = True
    async def mock_get(url, **kwargs):
        if "slow" in url:
            await asyncio.sleep(0.4)
            mock_resp = AsyncMock()
            mock_resp.is_success = True
            mock_resp.status_code = 200
            return mock_resp
        elif "fast" in url:
            mock_resp = AsyncMock()
            mock_resp.is_success = True
            mock_resp.status_code = 200
            return mock_resp
        elif "timeout" in url:
            raise httpx2.TimeoutException("Slow timeout")
        else:
            raise httpx2.RequestError("Failed", request=AsyncMock())
    urls = [
        HttpUrl("https://slow-site.com"),
        HttpUrl("https://fast-site.com"),
        HttpUrl("https://timeout-site.com"),
    ]
    with patch("httpx2.AsyncClient.get", side_effect=mock_get):
        start = time.perf_counter()
        results = await check_urls_health(urls, mock_checker)
        elapsed = time.perf_counter() - start
    # 1. Total time should be approx ~0.4s (concurrent, bounded by the slowest task), NOT 0.4s + timeouts
    assert elapsed < 0.8, f"Took {elapsed:.2f}s, expected concurrent execution under 0.8s"
    # 2. All 3 URL results returned properly
    assert len(results) == 3
    statuses = {str(r.url): r.status for r in results}
    assert statuses["https://slow-site.com/"] == "healthy"
    assert statuses["https://fast-site.com/"] == "healthy"
    assert statuses["https://timeout-site.com/"] == "timeout"

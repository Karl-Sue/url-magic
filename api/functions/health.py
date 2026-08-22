import asyncio
import time

import httpx2
from pydantic import HttpUrl

from core.middleware import GoogleSafeBrowsingChecker, UrlSecurityError
from schemas.health_check import URLHealthStatus


async def check_single_url_health(
    url_obj: HttpUrl,
    safe_browsing_checker: GoogleSafeBrowsingChecker,
    client: httpx2.AsyncClient,
) -> URLHealthStatus:
    url_str = str(url_obj)

    # 1. Security check using Google Safe Browsing
    try:
        is_safe = await safe_browsing_checker.is_safe(url_str)
        if not is_safe:
            return URLHealthStatus(
                url=url_obj,
                status="unsafe",
                error="URL flagged by Google Safe Browsing",
            )
    except (UrlSecurityError, OSError) as exc:
        # If security check fails (e.g. API key issue/network error), log or mark standard error
        return URLHealthStatus(
            url=url_obj,
            status="error",
            error=f"Security check failed: {exc}",
        )

    # 2. HTTP Latency and Status Check
    start_time = time.perf_counter()
    try:
        response = await client.get(url_str, timeout=5.0, follow_redirects=True)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        
        status_label = "healthy" if response.is_success else "unhealthy"
        return URLHealthStatus(
            url=url_obj,
            status=status_label,
            status_code=response.status_code,
            latency_ms=latency_ms,
        )
    except httpx2.TimeoutException:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return URLHealthStatus(
            url=url_obj,
            status="timeout",
            latency_ms=latency_ms,
            error="Request timed out after 5.0 seconds",
        )
    except httpx2.RequestError as exc:
        return URLHealthStatus(
            url=url_obj,
            status="unreachable",
            error=f"Connection failed: {exc}",
        )


async def check_urls_health(
    urls: list[HttpUrl],
    safe_browsing_checker: GoogleSafeBrowsingChecker,
) -> list[URLHealthStatus]:
    """Checks safety, status, and latency concurrently for a bulk list of URLs."""
    async with httpx2.AsyncClient(headers={"User-Agent": "URL-Magic-HealthCheck/1.0"}) as client:
        tasks = [
            check_single_url_health(url, safe_browsing_checker, client)
            for url in urls
        ]
        return await asyncio.gather(*tasks)

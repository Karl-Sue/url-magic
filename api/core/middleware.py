import asyncio
import ipaddress
import json
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse

from core.config import settings
from db.redis import RedisRepository


class UrlSecurityError(ValueError):
    pass


class BlockedUrlError(UrlSecurityError):
    pass


class RateLimitExceededError(UrlSecurityError):
    pass


class UrlReputationChecker(Protocol):
    async def is_safe(self, url: str) -> bool:
        ...


class UrlRateLimiter(Protocol):
    async def increment(self, key: str, ttl: int) -> int:
        ...


@dataclass(frozen=True, slots=True)
class UrlSecurityConfig:
    rate_limit_count: int = settings.url_create_rate_limit_count
    rate_limit_window_seconds: int = settings.url_create_rate_limit_window_seconds
    safe_browsing: str = settings.safe_browsing
    safe_browsing_client_id: str = settings.safe_browsing_client_id
    safe_browsing_client_version: str = settings.safe_browsing_client_version


@dataclass(slots=True)
class GoogleSafeBrowsingConfig:
    api_key: str = ""
    client_id: str = "url-magic"
    client_version: str = "1.0.0"
    api_url: str = "https://safebrowsing.googleapis.com/v4/threatMatches:find"


class GoogleSafeBrowsingChecker:
    def __init__(self, config: GoogleSafeBrowsingConfig | None = None):
        self.config = config or GoogleSafeBrowsingConfig()

    async def is_safe(self, url: str) -> bool:
        if not self.config.api_key:
            return True
        return await asyncio.to_thread(self._is_safe_sync, url)

    def _is_safe_sync(self, url: str) -> bool:
        payload = {
            "client": {
                "clientId": self.config.client_id,
                "clientVersion": self.config.client_version,
            },
            "threatInfo": {
                "threatTypes": [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION",
                ],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}],
            },
        }

        request = urllib.request.Request(
            f"{self.config.api_url}?key={self.config.api_key}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                body = response.read()
        except urllib.error.HTTPError as exc:
            if exc.code == 204:
                return True
            raise UrlSecurityError(f"Safe Browsing lookup failed with HTTP {exc.code}") from exc
        except OSError as exc:
            raise UrlSecurityError("Safe Browsing lookup failed") from exc

        if not body:
            return True

        data = json.loads(body)
        return not data.get("matches")


class RedisRateLimiter:
    def __init__(self, redis_repo: RedisRepository):
        self.redis_repo = redis_repo

    async def increment(self, key: str, ttl: int) -> int:
        return await self.redis_repo.increment_counter(key, ttl)


class UrlSecurityMiddleware:
    def __init__(
        self,
        *,
        redis_repo: RedisRepository,
        rate_limit_count: int | None = None,
        rate_limit_window_seconds: int | None = None,
        config: UrlSecurityConfig | None = None,
        reputation_checker: UrlReputationChecker | None = None,
        rate_limiter: UrlRateLimiter | None = None,
    ):
        base_config = config or UrlSecurityConfig()
        self.config = UrlSecurityConfig(
            rate_limit_count=rate_limit_count if rate_limit_count is not None else base_config.rate_limit_count,
            rate_limit_window_seconds=(
                rate_limit_window_seconds
                if rate_limit_window_seconds is not None
                else base_config.rate_limit_window_seconds
            ),
            safe_browsing=base_config.safe_browsing,
            safe_browsing_client_id=base_config.safe_browsing_client_id,
            safe_browsing_client_version=base_config.safe_browsing_client_version,
        )
        self.reputation_checker = reputation_checker or GoogleSafeBrowsingChecker(
            GoogleSafeBrowsingConfig(
                api_key=self.config.safe_browsing,
                client_id=self.config.safe_browsing_client_id,
                client_version=self.config.safe_browsing_client_version,
            )
        )
        self.rate_limiter = rate_limiter or RedisRateLimiter(redis_repo)

    async def validate_url(
        self,
        url: str,
        *,
        creator_id: str | None = None,
        client_ip: str | None = None,
    ) -> None:
        await asyncio.to_thread(_validate_destination, url)
        await _enforce_rate_limit(
            rate_limiter=self.rate_limiter,
            rate_limit_count=self.config.rate_limit_count,
            rate_limit_window_seconds=self.config.rate_limit_window_seconds,
            creator_id=creator_id,
            client_ip=client_ip,
        )

        if self.reputation_checker and not await self.reputation_checker.is_safe(url):
            raise BlockedUrlError("URL was flagged by the reputation service")


def _validate_destination(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise BlockedUrlError("Only http and https URLs are allowed")
    if not parsed.hostname:
        raise BlockedUrlError("URL must include a hostname")

    _ensure_public_hostname(parsed.hostname, parsed.port, parsed.scheme)


def _ensure_public_hostname(hostname: str, port: int | None, scheme: str) -> None:
    if hostname.lower() == "localhost":
        raise BlockedUrlError("Localhost URLs are not allowed")

    try:
        host_ip = ipaddress.ip_address(hostname)
    except ValueError:
        host_ip = None

    if host_ip is not None:
        _ensure_public_ip(host_ip)
        return

    resolved_port = port or (443 if scheme == "https" else 80)
    try:
        addresses = socket.getaddrinfo(hostname, resolved_port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise BlockedUrlError("Unable to resolve hostname") from exc

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        _ensure_public_ip(ip)


def _ensure_public_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
    if any(
        [
            ip.is_private,
            ip.is_loopback,
            ip.is_link_local,
            ip.is_multicast,
            ip.is_reserved,
            ip.is_unspecified,
        ]
    ):
        raise BlockedUrlError("Private, loopback, and reserved IP ranges are not allowed")


async def _enforce_rate_limit(
    *,
    rate_limiter: UrlRateLimiter,
    rate_limit_count: int,
    rate_limit_window_seconds: int,
    creator_id: str | None,
    client_ip: str | None,
) -> None:
    limiters: list[tuple[str, str]] = []
    if client_ip:
        limiters.append(("ip", client_ip))
    if creator_id:
        limiters.append(("user", creator_id))

    for scope, value in limiters:
        key = f"rate-limit:url-create:{scope}:{value}"
        current = await rate_limiter.increment(key, rate_limit_window_seconds)
        if current > rate_limit_count:
            raise RateLimitExceededError("Short URL creation rate limit exceeded")
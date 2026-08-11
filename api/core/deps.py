from typing import AsyncGenerator

from core.config import settings
from core.middleware import (
    GoogleSafeBrowsingChecker,
    GoogleSafeBrowsingConfig,
    UrlSecurityMiddleware,
)
from db.cosmos_client import URLQueryRepository
from db.redis import RedisRepository

# Singletons / cached instances
_redis_repo: RedisRepository | None = None
_query_repo: URLQueryRepository | None = None


def get_redis_repository() -> RedisRepository:
    """Dependency provider for RedisRepository."""
    global _redis_repo
    if _redis_repo is None:
        _redis_repo = RedisRepository()
    return _redis_repo


def get_security_middleware() -> UrlSecurityMiddleware:
    """Dependency provider for UrlSecurityMiddleware with Google Safe Browsing."""
    redis_repo = get_redis_repository()
    reputation_checker = GoogleSafeBrowsingChecker(
        config=GoogleSafeBrowsingConfig(
            api_key=settings.safe_browsing,
            client_id=settings.safe_browsing_client_id,
            client_version=settings.safe_browsing_client_version,
        )
    )
    return UrlSecurityMiddleware(
        redis_repo=redis_repo,
        reputation_checker=reputation_checker,
    )


def get_query_repository() -> URLQueryRepository:
    """Dependency provider for URLQueryRepository."""
    global _query_repo
    if _query_repo is None:
        redis_repo = get_redis_repository()
        security_middleware = get_security_middleware()
        _query_repo = URLQueryRepository(
            redis_repo=redis_repo,
            security_middleware=security_middleware,
        )
    return _query_repo

from fastapi import APIRouter, Depends, status

from core.deps import get_security_middleware
from core.middleware import UrlSecurityMiddleware
from functions.health import check_urls_health
from schemas.health_check import HealthCheckRequest, HealthCheckResponse

router = APIRouter()


@router.post(
    "/health",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check health status and latency for a list of URLs",
)
async def check_health(
    payload: HealthCheckRequest,
    security_middleware: UrlSecurityMiddleware = Depends(get_security_middleware),
):
    """Bulk health and latency checker endpoint.
    
    1. Runs Google Safe Browsing check for each URL.
    2. Performs concurrent HTTP requests to record latency_ms and status_code.
    """
    safe_browsing_checker = security_middleware.reputation_checker
    results = await check_urls_health(payload.urls, safe_browsing_checker)
    
    return HealthCheckResponse(results=results)

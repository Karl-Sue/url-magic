from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from core.deps import get_query_repository
from db.cosmos_client import URLQueryRepository
from functions.redirect import get_redirect_url
from schemas.analytics import ClickEvent
from services.queue_service import queue_service

router = APIRouter()


def _resolve_device(user_agent: str | None) -> str:
    if not user_agent:
        return "Unknown"
    ua = user_agent.lower()
    if "tablet" in ua or "ipad" in ua:
        return "Tablet"
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    return "Desktop"


@router.get(
    "/{short_code}",
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
    summary="Redirect short code to original URL",
    responses={
        302: {"description": "Redirecting to original target URL"},
        404: {"description": "Short code not found or expired"},
    },
)
async def handle_redirect(
    short_code: str,
    request: Request,
    background_tasks: BackgroundTasks,
    query_repo: URLQueryRepository = Depends(get_query_repository),
) -> RedirectResponse:
    """Resolves a Base62 short code, issues an immediate 302 redirect, and enqueues click analytics."""
    original_url, status_code = await get_redirect_url(
        short_code, query_repo=query_repo
    )

    if status_code in (301, 302) and original_url:
        country = (
            request.headers.get("cf-ipcountry")
            or request.headers.get("x-azure-fd-clientip-country")
            or request.headers.get("x-country-code")
            or "Unknown"
        )
        referrer = request.headers.get("referer") or request.headers.get("referrer")
        device = _resolve_device(request.headers.get("user-agent"))

        event = ClickEvent(
            event_id=str(uuid4()),
            short_code=short_code,
            timestamp=datetime.now(UTC).isoformat(),
            country=country,
            referrer=referrer,
            device=device,
        )

        background_tasks.add_task(queue_service.enqueue_click, event.model_dump())

        return RedirectResponse(
            url=original_url,
            status_code=status.HTTP_302_FOUND,
            headers={"Cache-Control": "private, no-cache, no-store, max-age=0"},
        )

    if status_code == 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid short code format",
        )

    if status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short URL not found or expired",
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Internal server error resolving redirect",
    )

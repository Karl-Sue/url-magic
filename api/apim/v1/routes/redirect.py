from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse

from core.deps import get_query_repository
from db.cosmos_client import URLQueryRepository
from functions.redirect import get_redirect_url

router = APIRouter()


@router.get(
    "/{short_code}",
    response_class=RedirectResponse,
    status_code=status.HTTP_301_MOVED_PERMANENTLY,
    summary="Redirect short code to original URL",
    responses={
        301: {"description": "Redirecting to original target URL"},
        404: {"description": "Short code not found or expired"},
    },
)
async def handle_redirect(
    short_code: str,
    query_repo: URLQueryRepository = Depends(get_query_repository),
):
    """Resolves a Base62 short code and issues a low-latency 301 HTTP redirect."""
    original_url, status_code = await get_redirect_url(short_code, query_repo=query_repo)

    if status_code == 301 and original_url:
        return RedirectResponse(
            url=original_url,
            status_code=status.HTTP_301_MOVED_PERMANENTLY,
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

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from core.config import settings
from core.deps import get_query_repository
from core.middleware import (
    BlockedUrlError,
    RateLimitExceededError,
)
from db.cosmos_client import URLQueryRepository
from functions.creator import verify_session_id
from schemas.url import (
    QRCodeRequest,
    URLShortenRequest,
    URLShortenResponse,
)
from services.qr_generator import generate_qr_code

router = APIRouter()


@router.post("/shorten", response_model=URLShortenResponse, status_code=status.HTTP_201_CREATED)
async def shorten_url(
    payload: URLShortenRequest,
    request: Request,
    query_repo: URLQueryRepository = Depends(get_query_repository),
):
    """Shortens a URL after checking security, SSRF, rate-limiting,

    and Google Safe Browsing reputation. Saves the record to Azure Cosmos DB.
    """
    target_url = str(payload.url)

    # Extract guest_id from cookie or fallback to client IP
    cookie_token = request.cookies.get(settings.guest_cookie_name)
    creator_id = verify_session_id(cookie_token) if cookie_token else None
    # Check X-Forwarded-For header if behind APIM / reverse proxy, fallback to request.client.host
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    if not creator_id:
        creator_id = f"anon_ip_{client_ip}"

    try:
        doc = await query_repo.create_record(
            original_url=target_url,
            creator_id=creator_id,
            ttl=payload.ttl,
            client_ip=client_ip,
        )
    except BlockedUrlError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"URL security validation failed: {exc}",
        ) from exc
    except RateLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create short URL",
        ) from exc

    base_url = str(request.base_url).rstrip("/")
    short_code = doc["shortCode"]
    short_url = f"{base_url}/api/v1/{short_code}"

    return URLShortenResponse(
        short_code=short_code,
        short_url=short_url,
        original_url=doc["originalUrl"],
        created_at=doc["createdAt"],
        ttl=doc["ttl"],
    )


@router.post("/qr")
async def generate_url_qr(payload: QRCodeRequest):
    """Generates a PNG QR code for the provided URL."""
    target_url = str(payload.url)

    try:
        qr_bytes = generate_qr_code(
            url=target_url,
            box_size=payload.box_size,
            border=payload.border,
            fill_color=payload.fill_color,
            back_color=payload.back_color,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate QR code",
        ) from exc

    return Response(content=qr_bytes, media_type="image/png")

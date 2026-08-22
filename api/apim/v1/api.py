from fastapi import APIRouter, Response

from apim.v1.routes import health, redirect, url_ops
from functions.creator import create_guest_session
from schemas.session import GuestSessionResponse

api_router = APIRouter(prefix="/api/v1")

# Guest Session route
@api_router.get(
    "/session/guest",
    response_model=GuestSessionResponse,
    tags=["session"],
    summary="Issue a new guest session token and dual cookies",
)
async def get_guest_session(response: Response):
    """Issues a new guest session token (`guest_session` HttpOnly) and

    presence flag (`has_guest_session` JS readable) cookie.
    """
    guest_id = create_guest_session(response)

    return GuestSessionResponse(
        guest_id=guest_id,
        message="Guest session created successfully",
    )


# Register sub-routers from routes/
api_router.include_router(url_ops.router, tags=["URL Operations"])
api_router.include_router(redirect.router, tags=["Redirect"])
api_router.include_router(health.router, tags=["Health Check"])

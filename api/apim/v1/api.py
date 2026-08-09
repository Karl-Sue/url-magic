from fastapi import APIRouter, Response

from functions.creator import create_guest_session
from schemas.session import GuestSessionResponse

router = APIRouter(prefix="/api/v1", tags=["session"])


@router.get("/session/guest", response_model=GuestSessionResponse)
async def get_guest_session(response: Response):
    """Issues a new guest session token and dual cookies.

    Called by frontend when `has_guest_session` is missing.
    """
    guest_id = create_guest_session(response)

    return GuestSessionResponse(
        guest_id=guest_id,
        message="Guest session created successfully",
    )


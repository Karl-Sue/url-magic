import hashlib
import hmac
import html
import re
import uuid

from fastapi import Response

from core.config import settings

# Regex to strip dangerous script/HTML tags and javascript: URIs
DANGEROUS_PATTERNS = re.compile(r"(?i)<script\b[^<]*?>.*?</script>|javascript:|data:text/html")


def sanitize_input(value: str) -> str:
    """Sanitizes user text inputs by stripping dangerous script/XSS patterns

    and escaping HTML special characters (&, <, >, ", ').
    """
    if not value:
        return ""
    # Strip dangerous protocols and inline scripts
    cleaned = DANGEROUS_PATTERNS.sub("", value.strip())
    # Escape remaining HTML special characters
    return html.escape(cleaned)


def generate_guest_id() -> str:
    """Generates a unique guest session ID prefixed with anon_."""
    return f"anon_{uuid.uuid4().hex}"


def sign_session_id(session_id: str) -> str:
    """Creates an HMAC-SHA256 signature for a session ID.

    Returns token in format: <session_id>.<signature_hex>
    """
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        session_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{session_id}.{signature}"


def verify_session_id(token: str) -> str | None:
    """Verifies HMAC signature of a guest session token.

    Returns the session ID if signature is valid, or None if invalid/tampered.
    """
    if not token or "." not in token:
        return None

    session_id, signature = token.rsplit(".", 1)
    expected_signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        session_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if hmac.compare_digest(signature, expected_signature):
        return session_id
    return None


def issue_guest_cookies(response: Response, session_id: str) -> str:
    """Issues dual cookies on the HTTP response:

    1. guest_session: HttpOnly=True, Secure=True, SameSite=Lax (HMAC Signed)
    2. has_guest_session: HttpOnly=False, Secure=True, SameSite=Lax (JS Indicator)
    """
    token = sign_session_id(session_id)

    # 1. Security Cookie (HttpOnly - Cannot be read by JS)
    response.set_cookie(
        key=settings.guest_cookie_name,
        value=token,
        max_age=settings.guest_session_max_age_seconds,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )

    # 2. Presence Cookie (Non-HttpOnly - Readable by JS to avoid unnecessary API calls)
    response.set_cookie(
        key=settings.guest_flag_cookie_name,
        value="true",
        max_age=settings.guest_session_max_age_seconds,
        httponly=False,
        secure=True,
        samesite="lax",
        path="/",
    )

    return token


def create_guest_session(response: Response) -> str:
    """Generates a new signed guest session and sets dual cookies on the HTTP response.

    Called when the frontend detects that `has_guest_session` cookie is missing.
    """
    new_session_id = generate_guest_id()
    issue_guest_cookies(response, new_session_id)
    return new_session_id


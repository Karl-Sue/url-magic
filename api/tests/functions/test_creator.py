from fastapi import FastAPI
from fastapi.testclient import TestClient

from apim.v1.api import router as apim_router
from core.config import settings
from functions.creator import (
    sanitize_input,
    sign_session_id,
    verify_session_id,
)

app = FastAPI()
app.include_router(apim_router)
client = TestClient(app)


def test_sanitize_input():
    # Strips inline script and escapes HTML
    dirty = "<script>alert('xss')</script><a href='javascript:alert(1)'>Click</a> & test"
    clean = sanitize_input(dirty)
    assert "<script>" not in clean
    assert "javascript:" not in clean
    assert "&amp;" in clean


def test_hmac_session_signature():
    session_id = "anon_123456789"
    token = sign_session_id(session_id)
    assert token.startswith("anon_123456789.")

    # Valid token verifies correctly
    verified_id = verify_session_id(token)
    assert verified_id == session_id

    # Tampered token fails verification
    tampered_token = token + "bad"
    assert verify_session_id(tampered_token) is None


def test_get_guest_session_endpoint():
    response = client.get("/api/v1/session/guest")
    assert response.status_code == 200
    data = response.json()
    assert data["guest_id"].startswith("anon_")

    # Check that dual cookies are set properly
    cookies = response.cookies
    assert settings.guest_cookie_name in cookies
    assert cookies[settings.guest_flag_cookie_name] == "true"


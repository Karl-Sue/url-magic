from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from apim.v1.api import api_router
from core.middleware import BlockedUrlError, RateLimitExceededError

app = FastAPI()
app.include_router(api_router)
client = TestClient(app)


def test_shorten_url_success():
    mock_doc = {
        "id": "aB3k9X",
        "shortCode": "aB3k9X",
        "originalUrl": "https://example.com/test-url",
        "creatorId": "anon_123",
        "createdAt": "2026-08-10T12:00:00Z",
        "ttl": 31536000,
    }

    with patch("apim.v1.routes.url_ops._query_repo.create_record", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_doc

        response = client.post(
            "/api/v1/shorten",
            json={"url": "https://example.com/test-url"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["short_code"] == "aB3k9X"
        assert data["original_url"] == "https://example.com/test-url"
        assert "short_url" in data


def test_shorten_url_ssrf_blocked():
    with patch("apim.v1.routes.url_ops._query_repo.create_record", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = BlockedUrlError("Private, loopback, and reserved IP ranges are not allowed")

        response = client.post(
            "/api/v1/shorten",
            json={"url": "http://127.0.0.1/internal"},
        )

        assert response.status_code == 400
        assert "URL security validation failed" in response.json()["detail"]


def test_shorten_url_rate_limit_exceeded():
    with patch("apim.v1.routes.url_ops._query_repo.create_record", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = RateLimitExceededError("Rate limit exceeded")

        response = client.post(
            "/api/v1/shorten",
            json={"url": "https://example.com"},
        )

        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]


def test_generate_qr_code_endpoint():
    response = client.post(
        "/api/v1/qr",
        json={"url": "https://example.com"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 0

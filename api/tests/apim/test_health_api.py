from unittest.mock import AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from apim.v1.api import api_router
from core.deps import get_security_middleware

app = FastAPI()
app.include_router(api_router)
client = TestClient(app)


def test_health_check_endpoint_bulk_real_world():
    """Test API endpoint with a list of real-world target URLs."""
    mock_middleware = MagicMock()
    mock_middleware.reputation_checker = AsyncMock()
    mock_middleware.reputation_checker.is_safe.return_value = True

    app.dependency_overrides[get_security_middleware] = lambda: mock_middleware

    urls = [
        "https://github.com",
        "https://www.wikipedia.org",
        "https://httpbin.org/status/500",
    ]

    try:
        response = client.post(
            "/api/v1/health",
            json={"urls": urls},
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 3

        returned_urls = [r["url"] for r in data["results"]]
        assert "https://github.com/" in returned_urls
        assert "https://www.wikipedia.org/" in returned_urls
    finally:
        app.dependency_overrides.clear()


def test_health_check_endpoint_invalid_payload():
    """Test validation failure for malformed URL."""
    response = client.post(
        "/api/v1/health",
        json={"urls": ["invalid-url-string"]},
    )
    assert response.status_code == 422

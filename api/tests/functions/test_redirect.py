from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apim.v1.api import api_router
from core.deps import get_query_repository
from functions.redirect import get_redirect_url

app = FastAPI()
app.include_router(api_router)
client = TestClient(app, follow_redirects=False)


@pytest.mark.asyncio
async def test_get_redirect_url_success():
    mock_repo = AsyncMock()
    mock_repo.read_record.return_value = {
        "shortCode": "aB3k9X",
        "originalUrl": "https://example.com/destination",
    }

    url, status_code = await get_redirect_url("aB3k9X", query_repo=mock_repo)
    assert status_code == 301
    assert url == "https://example.com/destination"
    mock_repo.read_record.assert_called_once_with("aB3k9X")


@pytest.mark.asyncio
async def test_get_redirect_url_not_found():
    mock_repo = AsyncMock()
    mock_repo.read_record.return_value = None

    url, status_code = await get_redirect_url("nonexistent", query_repo=mock_repo)
    assert status_code == 404
    assert url is None


@pytest.mark.asyncio
async def test_get_redirect_url_invalid_format():
    mock_repo = AsyncMock()
    url, status_code = await get_redirect_url("invalid!code@", query_repo=mock_repo)
    assert status_code == 400
    assert url is None


def test_redirect_http_endpoint_success():
    mock_repo = AsyncMock()
    mock_repo.read_record.return_value = {"originalUrl": "https://example.com/destination"}

    app.dependency_overrides[get_query_repository] = lambda: mock_repo
    try:
        response = client.get("/api/v1/aB3k9X")
        assert response.status_code == 301
        assert response.headers["location"] == "https://example.com/destination"
    finally:
        app.dependency_overrides.clear()


def test_redirect_http_endpoint_not_found():
    mock_repo = AsyncMock()
    mock_repo.read_record.return_value = None

    app.dependency_overrides[get_query_repository] = lambda: mock_repo
    try:
        response = client.get("/api/v1/unknown")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()

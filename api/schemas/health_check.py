
from pydantic import BaseModel, Field, HttpUrl


class HealthCheckRequest(BaseModel):
    urls: list[HttpUrl] = Field(..., min_length=1, max_length=100)

class URLHealthStatus(BaseModel):
    url: HttpUrl
    status: str
    status_code: int | None = None
    latency_ms: float | None = None
    error: str | None = None

class HealthCheckResponse(BaseModel):
    results: list[URLHealthStatus]
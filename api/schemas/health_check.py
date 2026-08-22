
from pydantic import BaseModel, HttpUrl


class HealthCheckRequest(BaseModel):
    urls: list[HttpUrl]

class URLHealthStatus(BaseModel):
    url: HttpUrl
    status: str
    status_code: int | None = None
    latency_ms: float | None = None
    error: str | None = None

class HealthCheckResponse(BaseModel):
    results: list[URLHealthStatus]
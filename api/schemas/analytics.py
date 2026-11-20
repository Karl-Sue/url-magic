from pydantic import BaseModel


class ClickEvent(BaseModel):
    event_id: str
    short_code: str
    timestamp: str
    country: str = "Unknown"
    referrer: str | None = None
    device: str = "Desktop"

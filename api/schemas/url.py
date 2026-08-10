from pydantic import AnyHttpUrl, BaseModel, Field


class URLShortenRequest(BaseModel):
    url: AnyHttpUrl = Field(..., description="The original URL to shorten")
    ttl: int = Field(default=31536000, ge=60, le=315360000, description="Time to live in seconds (default: 1 year)")


class URLShortenResponse(BaseModel):
    short_code: str = Field(..., description="Unique Base62 short code")
    short_url: str = Field(..., description="Full shortened URL")
    original_url: str = Field(..., description="Original target URL")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")
    ttl: int = Field(..., description="Time to live in seconds")


class QRCodeRequest(BaseModel):
    url: AnyHttpUrl = Field(..., description="URL to encode into QR code")
    box_size: int = Field(default=10, ge=1, le=50, description="Pixel size per box")
    border: int = Field(default=4, ge=1, le=20, description="Border size in boxes (min 4)")
    fill_color: str = Field(default="black", description="Foreground module color")
    back_color: str = Field(default="white", description="Background color")

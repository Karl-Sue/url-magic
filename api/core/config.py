from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    # FastAPI Application Settings
    app_name: str = "URL Magic"
    version: str = "1.0.0"

    # Security and Session settings
    secret_key: str = "default-secret-key-change-in-production"
    guest_cookie_name: str = "guest_session"
    guest_flag_cookie_name: str = "has_guest_session"
    guest_session_max_age_seconds: int = 30 * 24 * 60 * 60  # 30 days

    # URL safety and abuse-prevention settings
    url_create_rate_limit_count: int = 10
    url_create_rate_limit_window_seconds: int = 300
    safe_browsing: str
    safe_browsing_client_id: str = "url-magic"
    safe_browsing_client_version: str = "1.0.0"

    # Azure Cosmos DB settings
    cosmos_endpoint: str = "https://localhost:8081"
    cosmos_key: str
    cosmos_database: str
    cosmos_container: str

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
settings = Settings() 
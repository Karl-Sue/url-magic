from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # FastAPI Application Settings
    app_name: str = "URL Magic"
    version: str = "1.0.0"

    # URL safety and abuse-prevention settings
    url_create_rate_limit_count: int = 10
    url_create_rate_limit_window_seconds: int = 300
    safe_browsing_api_key: str = ""
    safe_browsing_client_id: str = "url-magic"
    safe_browsing_client_version: str = "1.0.0"
    
settings = Settings() 
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # FastAPI Application Settings
    app_name: str = "URL Magic"
    version: str = "1.0.0"
    
settings = Settings() 
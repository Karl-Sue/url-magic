from fastapi import FastAPI

from apim.v1.api import api_router

app = FastAPI(
    title="URL Magic API",
    description="URL Shortener & Magic Link Service",
    version="1.0.0",
)

app.include_router(api_router)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apim.v1.api import api_router

app = FastAPI(
    title="URL Magic API",
    description="URL Shortener & Magic Link Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:4280",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4280",
    ],
    allow_origin_regex=r"https://.*\.azurestaticapps\.net",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader

from apim.v1.api import api_router

# API Key security definitions for OpenAPI / Swagger UI
# Azure Functions validates 'x-functions-key' at the host runtime level (injected by APIM)
functions_key_header = APIKeyHeader(
    name="x-functions-key",
    auto_error=False,
    description="Azure Functions Host Key (injected by APIM backend)",
)

apim_key_header = APIKeyHeader(
    name="Ocp-Apim-Subscription-Key",
    auto_error=False,
    description="Azure API Management Subscription Key (if APIM subscription enabled)",
)

app = FastAPI(
    title="URL Magic API",
    description="URL Shortener & Magic Link Service fronted by Azure API Management (APIM)",
    version="1.0.0",
)

# CORS Middleware configured for Localhost, SWA, and APIM
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:4280",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4280",
    ],
    allow_origin_regex=r"https://.*\.(azurestaticapps\.net|azure-api\.net)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[
        "*",
        "x-functions-key",
        "Ocp-Apim-Subscription-Key",
        "Content-Type",
        "Authorization",
    ],
    expose_headers=["x-functions-key", "Ocp-Apim-Subscription-Key"],
)

@app.get("/health", tags=["Root"])
async def root():
    return {
        "status": "healthy",
        "service": "URL Magic API",
        "gateway": "Azure API Management",
    }

app.include_router(api_router)

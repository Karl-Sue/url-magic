import azure.functions as func

from main import app as fastapi_app

# Azure Functions ASGI App wrapper
# http_auth_level=func.AuthLevel.FUNCTION secures the endpoint by requiring
# the 'x-functions-key' header (or 'code' query parameter) injected by
# Azure API Management (APIM).
app = func.AsgiFunctionApp(
    app=fastapi_app,
    http_auth_level=func.AuthLevel.FUNCTION
)
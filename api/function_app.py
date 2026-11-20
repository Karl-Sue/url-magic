import logging

import azure.functions as func

from core.config import settings
from functions.analytics_consumer import handle_click_event_message
from main import app as fastapi_app

logger = logging.getLogger(__name__)

# Azure Functions ASGI App wrapper
# http_auth_level=func.AuthLevel.FUNCTION secures the endpoint by requiring
# the 'x-functions-key' header (or 'code' query parameter) injected by
# Azure API Management (APIM).
app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.FUNCTION)


@app.queue_trigger(
    arg_name="msg",
    queue_name=settings.queue_name,
    connection="AzureWebJobsStorage",
)
async def process_click_event(msg: func.QueueMessage) -> None:
    """Processes enqueued click analytics events from Azure Storage Queue."""
    body = msg.get_body().decode("utf-8")
    await handle_click_event_message(body)

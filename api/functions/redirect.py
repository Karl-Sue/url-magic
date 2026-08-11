import logging

from db.cosmos_client import URLQueryRepository

logger = logging.getLogger(__name__)


async def get_redirect_url(
    short_code: str,
    query_repo: URLQueryRepository,
) -> tuple[str | None, int]:
    """Fast redirect lookup using Redis cache-first and Cosmos DB point-read fallback.

    Args:
        short_code: The Base62 short code to resolve.
        query_repo: The injected repository instance.

    Returns:
        Tuple[str | None, int]: (original_url or None, HTTP status code: 301/302 for success, 404 for missing)
    """
    if not short_code or not short_code.isalnum():
        return None, 400

    try:
        record = await query_repo.read_record(short_code)
        if record and "originalUrl" in record:
            return record["originalUrl"], 301

        return None, 404
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Redirect resolution failed for short_code '{short_code}': {exc}")
        return None, 500
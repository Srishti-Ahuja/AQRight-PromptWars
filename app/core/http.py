"""HTTP client connection pool manager for non-blocking asynchronous requests."""

from __future__ import annotations

from typing import Optional
import httpx

_http_client: Optional[httpx.AsyncClient] = None


import asyncio

def get_http_client() -> httpx.AsyncClient:
    """Returns or initializes the connection-pooled httpx.AsyncClient bound to current loop."""
    global _http_client
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _http_client is not None:
        # Check if client is closed or tied to a dead event loop
        client_loop = getattr(_http_client, "_loop", None)
        if _http_client.is_closed or (client_loop is not None and client_loop.is_closed()):
            _http_client = None

    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=8.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
        )
        if current_loop is not None:
            _http_client._loop = current_loop

    return _http_client



async def close_http_client() -> None:
    """Closes the connection pool on application shutdown."""
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None

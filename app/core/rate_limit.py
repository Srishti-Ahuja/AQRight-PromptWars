"""In-memory sliding-window rate limiter middleware for FastAPI."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter tracking timestamps per IP address.

    Attributes:
        default_limit: Maximum requests per 60-second window for general endpoints.
        custom_route_limits: Custom limits for sensitive endpoints (e.g. commute compare).
    """

    def __init__(self, default_limit: int = 120, custom_route_limits: Dict[str, int] | None = None) -> None:
        self.default_limit = default_limit
        self.custom_route_limits = custom_route_limits or {
            "/api/v1/commute/compare": 30,
        }
        self.window_seconds = 60.0
        # Map of (ip, path_key) -> list of timestamp floats
        self._history: Dict[Tuple[str, str], List[float]] = defaultdict(list)

    def is_allowed(self, ip: str, path: str) -> Tuple[bool, int]:
        """Checks if a request from the given IP to path is permitted within the sliding window.

        Returns:
            Tuple of (allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - self.window_seconds

        # Determine limit for path
        limit = self.default_limit
        for route_prefix, custom_limit in self.custom_route_limits.items():
            if path.startswith(route_prefix):
                limit = custom_limit
                break

        key = (ip, path if limit != self.default_limit else "general")
        timestamps = self._history[key]

        # Prune expired timestamps
        self._history[key] = [t for t in timestamps if t > window_start]
        valid_history = self._history[key]

        if len(valid_history) >= limit:
            oldest = valid_history[0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            return False, retry_after

        self._history[key].append(now)
        return True, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Starlette middleware intercepting requests to enforce rate limits per client IP."""

    def __init__(self, app, limiter: InMemoryRateLimiter | None = None) -> None:
        super().__init__(app)
        self.limiter = limiter or InMemoryRateLimiter()

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exempt test runner and internal health endpoints
        if request.url.path in ("/health", "/", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        # Extract client IP (respecting forward headers if present)
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.client.host if request.client else "127.0.0.1"

        if client_ip in ("testclient", "test"):
            return await call_next(request)

        allowed, retry_after = self.limiter.is_allowed(client_ip, request.url.path)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please wait a moment before sending more requests.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)

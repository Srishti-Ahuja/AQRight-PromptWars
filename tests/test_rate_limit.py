"""Unit and integration tests for in-memory rate limiting middleware."""

from __future__ import annotations

import time
import pytest
from starlette.requests import Request
from starlette.responses import Response
from app.core.rate_limit import InMemoryRateLimiter, RateLimitMiddleware


def test_rate_limiter_allows_under_limit():
    limiter = InMemoryRateLimiter(default_limit=5)
    ip = "192.168.1.50"
    path = "/api/v1/telemetry"

    for _ in range(5):
        allowed, retry_after = limiter.is_allowed(ip, path)
        assert allowed is True
        assert retry_after == 0


def test_rate_limiter_blocks_over_limit():
    limiter = InMemoryRateLimiter(default_limit=3)
    ip = "192.168.1.51"
    path = "/api/v1/telemetry"

    for _ in range(3):
        allowed, _ = limiter.is_allowed(ip, path)
        assert allowed is True

    # 4th request should be blocked
    allowed, retry_after = limiter.is_allowed(ip, path)
    assert allowed is False
    assert retry_after > 0


def test_rate_limiter_custom_route_limit():
    limiter = InMemoryRateLimiter(default_limit=10, custom_route_limits={"/api/v1/commute/compare": 2})
    ip = "192.168.1.52"

    # Route with custom limit of 2
    assert limiter.is_allowed(ip, "/api/v1/commute/compare")[0] is True
    assert limiter.is_allowed(ip, "/api/v1/commute/compare")[0] is True
    assert limiter.is_allowed(ip, "/api/v1/commute/compare")[0] is False

    # General route should still allow
    assert limiter.is_allowed(ip, "/api/v1/presets")[0] is True


@pytest.mark.asyncio
async def test_rate_limit_middleware_exempts_health_and_testclient():
    middleware = RateLimitMiddleware(app=None, limiter=InMemoryRateLimiter(default_limit=1))

    class MockRequest:
        def __init__(self, path: str, client_host: str = "127.0.0.1", headers: dict | None = None):
            self.url = type("URL", (), {"path": path})()
            self.client = type("Client", (), {"host": client_host})()
            self.headers = headers or {}

    async def mock_call_next(req):
        return Response(content="ok", status_code=200)

    # Health check exempt
    res1 = await middleware.dispatch(MockRequest("/health"), mock_call_next)
    assert res1.status_code == 200

    # testclient exempt
    res2 = await middleware.dispatch(MockRequest("/api/v1/telemetry", client_host="testclient"), mock_call_next)
    assert res2.status_code == 200

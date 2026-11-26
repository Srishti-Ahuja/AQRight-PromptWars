"""FastAPI Application Entrypoint for AQRight."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.http import close_http_client
from app.core.rate_limit import RateLimitMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies strict HTTP security headers to protect against framing, sniffing, and XSS."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), microphone=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "connect-src 'self' https://*.open-meteo.com https://nominatim.openstreetmap.org https://router.project-osrm.org; "
            "img-src 'self' data: https:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown lifecycle events."""
    yield
    # Gracefully shut down HTTP connection pool on exit
    await close_http_client()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Hyper-Personalized Explainable AI (XAI) Smog & Urban Air Quality Assistant for Indian Households. "
        "Calculates official CPCB NAQI sub-indices, CAQM GRAP stages, atmospheric boundary-layer inversion trapping, "
        "and Berkeley Earth cigarette-equivalent inhalation metrics."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Apply Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Apply Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Cross-Origin Resource Sharing (CORS) Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if not settings.debug else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount API Router
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health", tags=["System"])
async def health_check() -> JSONResponse:
    """Performs liveness and health verification check."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": settings.app_name,
            "version": "1.0.0",
        },
    )


@app.get("/", tags=["System"])
async def root() -> JSONResponse:
    """Root endpoint detailing API documentation and status."""
    return JSONResponse(
        status_code=200,
        content={
            "service": settings.app_name,
            "version": "1.0.0",
            "documentation": "/docs",
            "endpoints": {
                "telemetry": f"{settings.api_prefix}/telemetry",
                "presets": f"{settings.api_prefix}/presets",
                "search": f"{settings.api_prefix}/cities/search",
                "xai_recommendations": f"{settings.api_prefix}/recommendations/xai",
                "source_attribution": f"{settings.api_prefix}/telemetry/attribution",
                "commute_compare": f"{settings.api_prefix}/commute/compare",
            },
        },
    )



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

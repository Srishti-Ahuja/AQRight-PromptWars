"""FastAPI Application Entrypoint for AQRight."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown lifecycle events."""
    # Startup initialization
    yield
    # Clean shutdown


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

# Cross-Origin Resource Sharing (CORS) Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits frontend dev servers on any local port
    allow_credentials=True,
    allow_methods=["*"],
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
            },
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

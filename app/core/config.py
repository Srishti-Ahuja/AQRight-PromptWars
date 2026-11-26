"""Application configuration and environment settings."""

from __future__ import annotations

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for AQRight FastAPI service.

    Attributes:
        app_name: The human-readable application title.
        api_prefix: Base URL prefix for v1 API endpoints.
        debug: Flag indicating whether debug mode is enabled.
        cors_origins: Permitted origins for Cross-Origin Resource Sharing.
        cache_ttl_seconds: In-memory telemetry cache retention period (15 minutes).
        http_timeout_seconds: Maximum duration before aborting external upstream API calls.
        open_meteo_aq_url: Upstream Open-Meteo Air Quality endpoint.
        open_meteo_weather_url: Upstream Open-Meteo Weather forecast endpoint.
        open_meteo_geocoding_url: Upstream Open-Meteo Geocoding endpoint.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AQRight — Explainable AI Smog Assistant"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # Security & CORS: Allow standard local frontend dev ports
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Performance: 15-minute TTL caching & 8-second request deadline
    cache_ttl_seconds: int = 900
    http_timeout_seconds: float = 8.0

    # Upstream Endpoints
    open_meteo_aq_url: str = "https://air-quality-api.open-meteo.com/v1/air-quality"
    open_meteo_weather_url: str = "https://api.open-meteo.com/v1/forecast"
    open_meteo_geocoding_url: str = "https://geocoding-api.open-meteo.com/v1/search"
    osrm_router_url: str = "https://router.project-osrm.org/route/v1"
    nominatim_url: str = "https://nominatim.openstreetmap.org/search"



settings = Settings()

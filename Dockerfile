# ---- Build stage ----------------------------------------------------------
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build‑time dependencies (optional, for faster pip installs)
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY app/__init__.py ./

# ---- Runtime stage --------------------------------------------------------
FROM python:3.12-slim AS runtime
WORKDIR /app

# Copy only the installed packages from the builder (small image)
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy the source code
COPY app/ ./app/
COPY app/__init__.py ./

# Expose the port FastAPI will run on (Render provides $PORT)
EXPOSE 8000

# Use a shell form command so that ${PORT:-8000} is expanded at container start‑up.
# Render injects the PORT env var; the default of 8000 is used when it is not set.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

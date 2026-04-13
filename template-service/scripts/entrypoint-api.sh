#!/bin/sh
# Entrypoint for the FastAPI gateway container only.
# In Kubernetes this runs as the main container while the engine
# runs as a sidecar (see charts/templates/deployment.yaml).
# For local development, use entrypoint.sh which starts both processes.

set -e

# Run database migrations (only the API container should do this)
echo "Running Database Migrations..."
alembic upgrade head

# Start FastAPI Gateway (foreground, public port 8000)
echo "Starting FastAPI Gateway on port 8000..."
exec uvicorn backend_template.web.app:app \
    --host 0.0.0.0 \
    --port 8000 \
    --root-path "${ROOT_PATH:-}" \
    --forwarded-allow-ips="*"

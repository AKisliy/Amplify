#!/bin/sh

set -e

# 1. Run Migrations
# This ensures the DB is up-to-date before the app starts.
# We use the sync driver logic we just built.
echo "Running Database Migrations..."
alembic upgrade head

# 2. Start Engine
echo "Starting Engine on port 8188..."
PYTHONPATH=/app python backend_template/engine/main.py &

# 3. Start FastAPI Gateway (foreground, public port)
exec uvicorn backend_template.web.app:app \
    --host 0.0.0.0 \
    --port 8000 \
    --root-path "${ROOT_PATH:-}" \
    --forwarded-allow-ips="*"
#!/bin/sh

set -e

# 1. Run Migrations
# This ensures the DB is up-to-date before the app starts.
# We use the sync driver logic we just built.
echo "Running Database Migrations..."
alembic upgrade head

# 2. Start the Application
# This passes the CMD from Dockerfile (uvicorn ...) to the shell
exec "$@"
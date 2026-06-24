#!/bin/sh
# Entrypoint for the Temporal worker Deployment.
# Runs alongside the API deployment using the same image.

set -e

echo "Starting Temporal worker..."
exec python -m backend_template.temporal.worker

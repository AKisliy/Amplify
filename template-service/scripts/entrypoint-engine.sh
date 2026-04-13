#!/bin/sh
# Entrypoint for the ComfyUI engine sidecar container.
# In Kubernetes this runs alongside the FastAPI gateway in the same pod,
# sharing the network namespace so the API can reach the engine via
# http://localhost:8188 (see config.py: engine_base_url default).
# For local development, the engine is started by entrypoint.sh instead.

set -e

echo "Starting ComfyUI Engine on port 8188..."
exec python backend_template/engine/main.py

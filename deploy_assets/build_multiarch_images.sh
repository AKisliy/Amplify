#!/bin/bash
set -e

# Define registry (Change this to your registry)
REGISTRY="your-docker-registry"

# Ensure buildx is set up
docker buildx create --name multiarch-builder --use || true
docker buildx inspect multiarch-builder --bootstrap

echo "Building multi-arch images for linux/amd64 and linux/arm64..."

# Build UserService
echo "Building userservice..."
docker buildx build --platform linux/amd64,linux/arm64 -t $REGISTRY/userservice:latest ./userservice --push

# Build Publisher
echo "Building publisher..."
docker buildx build --platform linux/amd64,linux/arm64 -t $REGISTRY/publisher:latest ./publisher --push

# Build MediaIngest
echo "Building media-ingest..."
docker buildx build --platform linux/amd64,linux/arm64 -t $REGISTRY/media-ingest:latest ./media-ingest --push

echo "Build complete! Images pushed to $REGISTRY."

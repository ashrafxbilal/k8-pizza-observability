#!/bin/bash
set -e

echo "Setting up Docker Buildx for multi-architecture builds"
# Create a new builder instance if it doesn't exist
if ! docker buildx inspect multiplatform &>/dev/null; then
  echo "Creating new buildx builder 'multiplatform'"
  docker buildx create --name multiplatform --use
else
  echo "Using existing buildx builder 'multiplatform'"
  docker buildx use multiplatform
fi

# Make sure the builder is running
docker buildx inspect --bootstrap

# Get the absolute path to the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Project root: $PROJECT_ROOT"

echo "Building multi-architecture image for pizza-controller"

# Navigate to the controller directory
cd "$PROJECT_ROOT/kubernetes/controller"
echo "Current directory: $(pwd)"

docker buildx build --platform linux/amd64,linux/arm64 \
  -t ashrafxbilal/pizza-controller:latest \
  --push .

echo "Building multi-architecture image for pizza-order-function"

# Navigate to the azure-function directory
cd "$PROJECT_ROOT/azure-function"
echo "Current directory: $(pwd)"

docker buildx build --platform linux/amd64,linux/arm64 \
  -t ashrafxbilal/pizza-order-function:latest \
  --push .

echo "Images built and pushed successfully!"
echo "You can now update your Kubernetes deployments with:"
echo "kubectl rollout restart deployment <pod-name>"
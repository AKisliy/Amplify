#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing dependencies for Amplify dev environment"

# Docker
if ! command -v docker &>/dev/null; then
  echo "→ Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
else
  echo "→ Docker already installed"
fi

# kubectl
if ! command -v kubectl &>/dev/null; then
  echo "→ Installing kubectl..."
  curl -fsSL "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" -o /tmp/kubectl
  sudo install -o root -g root -m 0755 /tmp/kubectl /usr/local/bin/kubectl
else
  echo "→ kubectl already installed"
fi

# minikube
if ! command -v minikube &>/dev/null; then
  echo "→ Installing minikube..."
  curl -fsSL https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 -o /tmp/minikube
  sudo install -o root -g root -m 0755 /tmp/minikube /usr/local/bin/minikube
else
  echo "→ minikube already installed"
fi

# helm
if ! command -v helm &>/dev/null; then
  echo "→ Installing helm..."
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
else
  echo "→ helm already installed"
fi

# helmfile
if ! command -v helmfile &>/dev/null; then
  echo "→ Installing helmfile..."
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
  curl -fsSL "https://github.com/helmfile/helmfile/releases/latest/download/helmfile_${OS}_${ARCH}" -o /tmp/helmfile
  sudo install -o root -g root -m 0755 /tmp/helmfile /usr/local/bin/helmfile
else
  echo "→ helmfile already installed"
fi

# helm-diff plugin (нужен helmfile)
if ! helm plugin list | grep -q diff; then
  echo "→ Installing helm-diff plugin..."
  helm plugin install https://github.com/databus23/helm-diff
else
  echo "→ helm-diff already installed"
fi

# istioctl
if ! command -v istioctl &>/dev/null; then
  echo "→ Installing istioctl..."
  curl -fsSL https://istio.io/downloadIstio | ISTIO_VERSION=1.25.2 TARGET_ARCH=x86_64 sh -
  sudo install -o root -g root -m 0755 istio-*/bin/istioctl /usr/local/bin/istioctl
  rm -rf istio-*/
else
  echo "→ istioctl already installed"
fi

echo ""
echo "==> All dependencies installed."
echo ""
if ! groups "$USER" | grep -q docker; then
  echo "⚠  Docker was just installed. Please log out and back in (or run 'newgrp docker') before continuing."
fi

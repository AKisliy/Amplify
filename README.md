## Amplify - best AI-tool u ever used ✨
[![Netlify Status](https://api.netlify.com/api/v1/badges/ec4fb378-5698-4bfa-b901-40957a5ba391/deploy-status)](https://app.netlify.com/projects/amplify-testing/deploys)



#### Overall architecture
Project's architure is drawn in [draw.io](https://drive.google.com/file/d/1BUl7EyMq89KCunxzplFYXj-51cYZGclK/view?usp=sharing). You'll have Editor permission, so feel free to add comments or change something.

---

## Local Development

### Prerequisites

Make sure the following tools are installed:
`docker`, `git`, `make`, `kubectl`, `minikube`, `helm`, `helmfile` (≥ 1.5), `istioctl` (≥ 1.25)

On Linux, install all dependencies at once:
```bash
bash scripts/dev/install-deps.sh
```

Recommended machine specs: 4 CPU cores, 16 GB RAM, 50 GB free disk space.

### Setup

**1. Clone the repository:**
```bash
git clone https://github.com/AKisliy/Amplify.git
cd Amplify
```

**2. Start infrastructure** (PostgreSQL, RabbitMQ, MinIO, Redis):
```bash
make dev-infra-up
```

**3. Start local Kubernetes cluster:**
```bash
make dev-cluster
```

> On machines with limited resources, override defaults:
> `make dev-cluster MINIKUBE_MEMORY=4096 MINIKUBE_CPUS=2`

**4. Build Docker images and load into the cluster:**
```bash
make dev-build
```

**5. Deploy cluster infrastructure and services:**
```bash
make dev-operators
make dev-deploy
```

**6. Expose Istio Ingress Gateway locally** (run in a separate terminal):
```bash
make dev-port-forward
```

**7. Check service status:**
```bash
make dev-status
```

**8. Start the frontend** (run in a separate terminal):
```bash
cd frontend && npm install && NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev
```

> On first run, open MinIO Console and create a bucket named `amplify-dev`.

### Available interfaces

| Interface | URL |
|-----------|-----|
| API (Istio Ingress Gateway) | http://localhost:8080 |
| Swagger (userservice) | http://localhost:8080/userservice/api/index.html?url=specification.json |
| Swagger (publisher) | http://localhost:8080/publisher/api/index.html?url=specification.json |
| Swagger (media-ingest) | http://localhost:8080/media/api/index.html?url=specification.json |
| Swagger (ai-gateway) | http://localhost:8080/ai-gateway/api/index.html?url=specification.json |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |
| RabbitMQ Management | http://localhost:15672 (guest / guest) |
| Frontend | http://localhost:3000 |

### Troubleshooting

| Error | Solution |
|-------|----------|
| `Cannot change memory size for existing cluster` | `make dev-cluster-reset` |
| `Docker is out of disk space` | `docker system prune -a`, then increase disk limit in Docker Desktop (≥ 60 GB) |
| `Requested cpu count N is greater than available` | `make dev-cluster MINIKUBE_CPUS=2` |
| `ImagePullBackOff` | `make dev-build-svc SVC=<service-name>` |
| `istioctl: No such file or directory` | `brew install istioctl` (macOS) or `bash scripts/dev/install-deps.sh` (Linux) |
| `context deadline exceeded` on deploy | `kubectl get pods -n amplify-dev` → `kubectl describe pod -n amplify-dev <pod>` |

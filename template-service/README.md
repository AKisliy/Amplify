# Template Service

FastAPI service that orchestrates AI-powered content generation workflows. It receives a graph definition (ComfyUI prompt format) from the frontend, executes it as a Temporal workflow, and publishes real-time node status events over RabbitMQ.

**Key responsibilities:**
- Template and project management (CRUD via PostgreSQL)
- Executing DAG-based AI pipelines via Temporal (Gemini, Veo, LangfusePrompt, HITL review nodes)
- Real-time job status broadcast (RabbitMQ → WebSocket Gateway → Frontend)
- Node result caching (PostgreSQL)
- LLM cost tracking via LiteLLM proxy → Langfuse

---

## Architecture

```
Frontend → POST /v2/templates/{id}/run
              ↓
         JobService → Temporal Workflow (GraphWorkflow)
                              ↓  (parallel DAG execution)
              ┌───────────────┼───────────────┐
         GeminiNode     LangfusePrompt    VeoNode ...
              └───────────────┼───────────────┘
                              ↓
                       RabbitMQ → WebSocket Gateway → Frontend
```

The Temporal **worker** runs in a separate process from the FastAPI **API server**. Both read from the same `.env` / environment variables.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.12+ | 3.14 has langfuse/pydantic-v1 issues |
| Poetry | 2.x | `pip install poetry` |
| Docker + Compose | any | for infra services |
| Temporal CLI | latest | `brew install temporal` |

External services required at runtime:
- **LiteLLM proxy** — LLM API gateway
- **Media Ingest service** — file storage (MinIO)
- **Google Cloud** — Vertex AI / Gemini credentials (service account key)
- **Langfuse** — prompt management + observability (can run self-hosted via docker-compose)

---

## Local Setup

### 1. Clone and install dependencies

```bash
cd template-service
poetry env use python3.12
poetry install
```

### 2. Start infrastructure services

```bash
# PostgreSQL + RabbitMQ (required)
docker compose up db rabbitmq -d

# Optional: self-hosted Langfuse stack (Postgres + Redis + ClickHouse + MinIO + Web)
docker compose up langfuse-db langfuse-redis langfuse-clickhouse langfuse-minio langfuse-worker langfuse-web -d
```

Langfuse UI is available at http://localhost:3100 (first run: create an account, then grab API keys).

### 3. Start Temporal dev server

```bash
temporal server start-dev
```

Temporal UI: http://localhost:8233

### 4. Configure environment

Copy the example env file for the Temporal worker and fill in your values:

```bash
cp backend_template/temporal/.env.example backend_template/temporal/.env
```

Key variables in `backend_template/temporal/.env`:

| Variable | Description |
|----------|-------------|
| `POSTGRES_DSN` | Full asyncpg DSN, e.g. `postgresql+asyncpg://user:pass@localhost:6432/db` |
| `TEMPORAL_HOST` | Temporal server address, e.g. `localhost:7233` (no `http://` prefix) |
| `LITELLM_BASE_URL` | LiteLLM proxy URL |
| `LITELLM_API_KEY` | LiteLLM API key |
| `POSTGRES_*` | Database connection details |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `GEMINI_PROJECT_ID` | Google Cloud project ID |
| `GEMINI_LOCATION` | Vertex AI region (e.g. `global`) |
| `GEMINI_STORAGE_URI` | GCS bucket for Veo output (e.g. `gs://your-bucket`) |
| `SERVICE_ACCOUNT_KEY_FILE` | Path to Google Cloud service account JSON key |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key |
| `LANGFUSE_HOST` | Langfuse instance URL |
| `MEDIA_INGEST_URL` | Media Ingest service base URL |

The FastAPI server reads `.env.example` by default in development. Copy and adjust it as needed:

```bash
cp .env.example .env  # if you maintain a root-level .env
```

### 5. Run database migrations

```bash
poetry run alembic upgrade head
```

### 6. Start the API server

```bash
poetry run uvicorn backend_template.main:app --reload --port 8000
```

### 7. Start the Temporal worker

```bash
poetry run python -m backend_template.temporal.worker
```

The worker discovers all node types from `engine/comfy_api_nodes/nodes_*.py` at startup and logs the registered types:

```
Temporal registry: N node types loaded: ['GeminiNode', 'VeoVideoGenerationNode', ...]
Temporal worker started on task queue 'template-execution'
```

---

## VS Code Debugging

A debug launch configuration for the Temporal worker is included in `.vscode/launch.json`.

**Setup:**
1. Select the Poetry Python interpreter: `Cmd+Shift+P` → `Python: Select Interpreter` → choose the Poetry virtualenv.
2. Copy the env file: `cp backend_template/temporal/.env.example backend_template/temporal/.env` and fill in your values.
3. Run **"Temporal Worker (template-service)"** from the Run & Debug panel.

The config sets `TEMPORAL_UNSANDBOXED=true` which disables the Temporal workflow sandbox, allowing the VS Code debugger (debugpy) to attach without `ModuleNotFoundError: No module named '_pydevd_bundle'` errors.

> **Note:** `UnsandboxedWorkflowRunner` disables Temporal's determinism enforcement — use only for local debugging, never in production.

---

## Running Tests

```bash
poetry run pytest
```
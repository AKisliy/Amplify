# Temporal Infrastructure (Self-hosted K8s)

## Temporal server components

| Component | Role |
|-----------|------|
| `temporal-frontend` | gRPC + HTTP gateway (port 7233), receives calls from SDK clients (workers, temporal_client). Internal cluster service — not a UI. |
| `temporal-history` | Workflow event history storage and replay |
| `temporal-matching` | Task queue management, dispatches activities to workers |
| `temporal-worker` | Runs internal system workflows (archival, etc.) |
| `temporal-ui` | Web UI for workflow visibility |
| PostgreSQL | Persistent store for all Temporal state |

All components deploy via the official `temporalio/temporal` Helm chart.

## PostgreSQL

Temporal requires a dedicated DB schema (or schemas). Can use the existing cluster
PostgreSQL instance with a new database — no separate PG pod needed. Temporal schema
is managed by the Temporal server's auto-setup or `temporal-admin-tools`.

Two schemas needed: `temporal` (workflow state) and `temporal_visibility` (search index).

## Sizing for 100 concurrent jobs

100 concurrent jobs × ~5 active nodes average = ~500 concurrent activities at peak.
Most activities are async HTTP calls (Gemini, Veo, ElevenLabs) — they spend most time
waiting on I/O, not CPU.

**Temporal server:** 2-4 vCPUs, 4-8 GB RAM. Can start with 1 replica per component
and scale horizontally if needed.

**Worker pods (template-service workers):** Each worker pod runs a Temporal worker with
configurable `max_concurrent_activities`. For async Python activities:
- 50-100 concurrent activities per pod is realistic (async I/O bound)
- 2-3 worker pods → 100-300 concurrent activities → well above the 500 peak estimate

Worker pods are stateless. Horizontal scaling is a Kubernetes HPA rule away.

## Task queues

A **task queue** is the logical channel between workflows and workers. Workers advertise
which task queue they listen to; workflows dispatch activities to a named queue.

**Option A: single task queue** (`template-execution`)
- Simpler
- All activity types share the same worker pool
- Risk: a burst of slow Veo operations (20min each) fills the pool and blocks fast Gemini calls

**Option B: per-type task queues** (`veo-activities`, `gemini-activities`, etc.)
- Workers per queue can be tuned independently
- Veo workers: few, long `start_to_close_timeout`
- Gemini workers: many, short timeout
- More Helm values to manage

**Recommendation:** start with Option A. If Veo starvation becomes observable, split
into at minimum two queues: `long-running` (Veo) and `default` (everything else).

## Temporal UI access

`temporal-ui` should be deployed as an internal-only service (no public ingress).
Access via `kubectl port-forward` or a VPN-gated ingress. It shows all workflow
executions, their history, signals, and failures — essential for debugging.

## Helm chart snippet (minimal)

```yaml
# helmfile.yaml addition
- name: temporal
  chart: temporal/temporal
  version: "0.x.x"
  values:
    - server:
        replicaCount: 1
      cassandra:
        enabled: false
      mysql:
        enabled: false
      postgresql:
        enabled: false        # use external PG
      schema:
        setup:
          enabled: true
          backoffLimit: 20
      server:
        config:
          persistence:
            default:
              driver: "sql"
              sql:
                driver: "postgres12"
                host: "postgresql.default.svc.cluster.local"
                database: "temporal"
            visibility:
              driver: "sql"
              sql:
                driver: "postgres12"
                host: "postgresql.default.svc.cluster.local"
                database: "temporal_visibility"
```

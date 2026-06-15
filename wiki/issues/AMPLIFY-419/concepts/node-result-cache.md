# Node Result Cache

## What ComfyUI does

`comfy_execution/caching.py` computes a hash of each node's inputs before execution.
If the hash matches a previous run, the node is skipped and the cached output is returned
(`execution_cached` event). The cache is **in-memory**: lost on pod restart, not shared
between workers.

## Design: persistent cache in PostgreSQL

Cache lookups happen inside each activity, before calling the external API:

```python
@activity.defn
async def execute_gemini(input: GeminiActivityInput) -> GeminiActivityOutput:
    cache_key = compute_input_hash(input)  # deterministic hash of all inputs

    cached = await cache_repo.get(cache_key)
    if cached:
        await publish_node_status(input.job_id, input.node_id, "CACHED")
        return cached

    result = await gemini_client.generate(input.prompt)
    output = GeminiActivityOutput(text=result.text)
    await cache_repo.set(cache_key, output, ttl_days=7)
    return output
```

Schema:

```sql
CREATE TABLE node_result_cache (
    input_hash  TEXT PRIMARY KEY,
    class_type  TEXT NOT NULL,
    output      JSONB NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ
);
```

`input_hash` = deterministic hash of `(class_type, sorted input key-value pairs)`.
For nodes with a `seed` input, the seed is included in the hash — different seeds produce
different cache entries, which is correct.

## PostgreSQL is sufficient at target scale

At 100 concurrent jobs (~500 concurrent cache lookups peak), PostgreSQL PRIMARY KEY
lookups via asyncpg are not a bottleneck. The performance difference vs. Redis
(~2-5ms vs. sub-millisecond) is irrelevant when the activity itself calls Veo (2 min)
or Gemini (~3s).

PostgreSQL would become a bottleneck at millions of lookups/sec — orders of magnitude
above the target scale.

## Advantages over ComfyUI in-memory cache

| | ComfyUI | PostgreSQL cache |
|---|---|---|
| Survives pod restart | No | Yes |
| Shared across workers | No (per-process) | Yes |
| Inspectable / evictable | No | Yes (`DELETE FROM node_result_cache`) |
| TTL per node type | No | Yes |
| Scope | per-process session | per-template or global |

## Cache abstraction

The cache is hidden behind a `Protocol` so the backend can be swapped without touching
activity code:

```python
class NodeResultCache(Protocol):
    async def get(self, key: str) -> NodeOutput | None: ...
    async def set(self, key: str, value: NodeOutput, ttl_days: int) -> None: ...

class PostgresNodeResultCache(NodeResultCache): ...
class RedisNodeResultCache(NodeResultCache): ...   # see decision below
```

Backend is injected via DI at worker startup. Switching = one line in config.

## Decision: Redis not added for node result cache

Redis is not in the current stack. At the target scale (100 concurrent jobs), PostgreSQL
is sufficient. Redis would be introduced only if/when it enters the stack for other
reasons (see below) — at that point the `RedisNodeResultCache` implementation can be
swapped in trivially.

## Where Redis belongs when it arrives

Redis is not the right tool for node result caching at this scale, but it is the right
tool for:

**API rate limiting** (primary motivation for adding Redis):
```python
# Atomic increment — reliable per-minute quota tracking per project
key = f"veo:rpm:{project_id}:{current_minute()}"
count = await redis.incr(key)
await redis.expire(key, 60)
if count > VEO_RPM_LIMIT:
    raise RateLimitError()
```
Gemini, Veo, ElevenLabs all have RPM/TPM limits. Without Redis, the choices are:
receive 429 and retry (wastes quota and time) or pessimistic locks in PostgreSQL (slow,
complex). Redis atomic `INCR` is the standard solution.

**Distributed locks** — prevent duplicate job submissions for the same template:
```python
async with redis.lock(f"template:{template_id}:running", timeout=300):
    await temporal_client.start_workflow(...)
```

**Summary:**

| Concern | Backend |
|---------|---------|
| Node result cache | PostgreSQL (now), Redis (if Redis added) |
| API rate limiting | Redis — primary reason to add it |
| Distributed locks | Redis |
| Workflow orchestration state | Temporal DB — never touch |

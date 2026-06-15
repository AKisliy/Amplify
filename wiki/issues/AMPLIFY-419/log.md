# Log: AMPLIFY-419

## 2026-06-15

Architectural research session. Defined problem (ComfyUI serial execution, HITL blocking, no durability), evaluated alternatives (Restate, Hatchet, Conductor, DIY), selected Temporal self-hosted. Documented full architecture: DAG execution model, activity design, HITL signal model, cancellation semantics, schema registry, K8s infra sizing, big bang migration path. Key decisions: full ComfyUI replacement, nodes as pure Temporal activities, graph JSON format preserved, frontend unchanged. Added: node result cache design (PostgreSQL, Redis-ready abstraction); decided Redis not added for cache — primary motivation for Redis is API rate limiting and distributed locks when it enters the stack.

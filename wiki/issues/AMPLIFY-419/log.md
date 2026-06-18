# Log: AMPLIFY-419

## 2026-06-18 (5)

Уточнён дизайн кэша: запись — всегда (каждый ран), чтение — только при can_use_cache=true в UI-зоне. Добавлен глобальный флаг cache_enabled в конфиге (отключает и чтение, и запись). Обновлён concepts/node-result-cache.md.

## 2026-06-18 (4)

Задокументирован финальный дизайн node result cache: UI-зона на канвасе → _meta.can_use_cache в graph JSON → NodeActivityInput.can_use_cache → проверка в динамической активности. TTL=7 дней, кэшируем MinIO UUID, ключ = sha256(class_type + sorted resolved inputs). Переписан concepts/node-result-cache.md.

## 2026-06-18 (3)

Задокументирован сценарий смерти пода в середине выполнения графа: event history, deterministic replay, почему завершённые ноды не перезапускаются. Добавлено в concepts/temporal-dag-execution.md, раздел "Что происходит при смерти пода".

## 2026-06-18 (2)

Реализован dynamic=True паттерн для нод (по образцу temporal-ai-agent): одна активность обрабатывает все class_type через activity.info().activity_type. Per-node политики retry/timeout вынесены в атрибут temporal_policy на классе ноды; policy_for() читает его через NODE_CLASS_MAPPINGS. Задокументировано в concepts/activity-retry-policy.md.

## 2026-06-18

Задокументирована механика топологических батчей в `temporal-dag-execution.md`: как `issubset(completed)` гарантирует, что нода стартует только после завершения всех предшественников; наглядный пример итераций; следствие об отсутствии параллелизма в линейных графах.

## 2026-06-15

Architectural research session. Defined problem (ComfyUI serial execution, HITL blocking, no durability), evaluated alternatives (Restate, Hatchet, Conductor, DIY), selected Temporal self-hosted. Documented full architecture: DAG execution model, activity design, HITL signal model, cancellation semantics, schema registry, K8s infra sizing, big bang migration path. Key decisions: full ComfyUI replacement, nodes as pure Temporal activities, graph JSON format preserved, frontend unchanged. Added: node result cache design (PostgreSQL, Redis-ready abstraction); decided Redis not added for cache — primary motivation for Redis is API rate limiting and distributed locks when it enters the stack.

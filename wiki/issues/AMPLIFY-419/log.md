# Log: AMPLIFY-419

## 2026-06-23

Фикс выполнения нод в Temporal: исправлена цепочка багов в `execute_node` / `_preprocess_resolved`. (1) Autogrow-агрегация: `_preprocess_resolved` переписан — используется `get_finalized_class_inputs` + фильтрация по valid_keys (дропает stale plain-ключи из config, например `media_file_0` рядом с `media_files.media_file_0`) + `build_nested_inputs` для dot-notation нестинга. Это точная репликация `get_input_data` ComfyUI. (2) Реализован `map_node_over_list`: для INPUT_IS_LIST=False нод все значения оборачиваются в `[v]`, execute вызывается N раз (max длина списка среди инпутов), результаты мерджатся через `merge_result_data` из `execution.py`. Для INPUT_IS_LIST=True (BaseUGCEditingNode) — один вызов с полными списками. Это фиксирует cascade: GeminiNode → N сегментов → Veo вызывается N раз → N видео → BaseUGCEditingNode получает список. (3) Hidden inputs: перед вызовом execute создаётся клон класса через `PREPARE_CLASS_CLONE(v3_data)` с заполненным `hidden_inputs` (unique_id=node_id, extra_pnginfo=exec_context+job_id+user_id). Фикс `AttributeError: 'NoneType'.unique_id`. (4) VS Code debug config для Temporal воркера добавлен в `.vscode/launch.json`.

## 2026-06-19 (2)

Архитектурный разбор: зачем ManualReviewTask в своей БД, если Temporal хранит workflow state. Вывод: не дублирование — разные роли. БД: payload для UI-рендеринга + idempotency guard (status="completed" блокирует двойной сабмит/двойной сигнал). Temporal: execution state. Decision в нашей БД — теперь лишнее (никуда не читается), но некритично. Shot regeneration (отложен) потребует мутируемого payload — тоже причина держать запись в БД. Добавлены v2-методы в ManualReviewService: complete_task_v2 (DB + Temporal signal), get_task; complete_task оставлен чистым (DB only, v1/ComfyUI совместимость). Обновлён v2 роутер: GET /{task_id}, POST /{task_id}/complete → complete_task_v2.

## 2026-06-19

Реализован HITL v2: две generic-активности `hitl_setup`/`hitl_finalize`, единый сигнал `hitl_complete(node_id, decision)`, интерфейс из 4 classmethod на ноде (`temporal_hitl`, `hitl_node_type/payload/output/context`), конкурентное выполнение HITL-нод в батче через `asyncio.gather`, per-job `exec_context` (замена `extra_pnginfo`) с `_context_patch` механизмом, кэширование HITL-нод с сохранением `_context_patch` в кэш-значении. `ManualReviewService.complete_task` отправляет Temporal-сигнал. Также реализован CACHED-статус и UI Cache Zone (фронтенд). Задокументировано в concepts/hitl-signal-model.md (переписан), concepts/exec-context.md (новый), decisions.md (создан).

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

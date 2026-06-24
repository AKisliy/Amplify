# Decisions: AMPLIFY-419

> Populated during implementation. Each entry records a deviation from plan.md.
> Updated inline as deviations happen — not retroactively at PR time.

## [2026-06-19] Единый сигнал hitl_complete вместо per-type сигналов

**Что изменено:** В plan.md подразумевалось, что у каждой HITL-ноды будет свой сигнал
(`shot_review_completed`, `script_review_completed`). Реализован один сигнал `hitl_complete(node_id, decision)` для всех типов.

**Почему:** Тип ноды уже закодирован в `node_id` + `ManualReviewTask.node_type`. Разделять сигналы — ненужная сложность. Единый сигнал делает воркфлоу extensible: новая HITL-нода не требует нового сигнала.

**Impact on plan.md:** Пункт 5 ("HITL via Temporal signals") выполнен, формат сигнала уточнён.

---

## [2026-06-19] HITL-ноды: интерфейс из 4 classmethod вместо отдельного activity per type

**Что изменено:** Вместо того чтобы каждая HITL-нода регистрировала свою активность,
введён общий интерфейс (`temporal_hitl = True` + `hitl_node_type/payload/output/context`)
и две generic-активности `hitl_setup`/`hitl_finalize`, диспатчащие через `NODE_CLASS_MAPPINGS`.

**Почему:** Сохраняет принцип "новая нода = новый файл, без правок в воркфлоу". Аналогично тому,
как `execute_node(dynamic=True)` обрабатывает все обычные ноды.

**Impact on plan.md:** Усиливает пункт 2 ("nodes as Temporal activities") — ноды остаются самодостаточными единицами.

---

## [2026-06-19] HITL-ноды конкурентны в батче (не сериализованы)

**Что изменено:** Предполагалось, что HITL-ноды в одном батче выполняются последовательно
("one human review at a time"). Реализован конкурентный подход: все ноды батча (включая HITL)
попадают в один `asyncio.gather`.

**Почему:** Нет технической причины сериализовывать. Несколько HITL-нод могут одновременно
ждать ревью — человек решает, в каком порядке смотреть. Каждая `wait_condition` ждёт в своей
корутине, разблокируется по своему сигналу.

**Impact on plan.md:** Пункт 5 остаётся корректным; конкурентность — уточнение реализации.

---

## [2026-06-19] Введён exec_context — замена extra_pnginfo

**Что изменено:** В plan.md не упоминался механизм передачи контекста между нодами.
В реализации добавлены `_exec_context: dict` на workflow и `exec_context: dict` в `NodeActivityInput`.
Ноды возвращают `_context_patch` (дельту) вместо мутации глобального dict'а.

**Почему:** `extra_pnginfo` ComfyUI был in-memory глобальным dict. В Temporal-мире его
нет — активности изолированы. `exec_context` — дурабельная замена. `_context_patch`
(дельта, не полный контекст) минимизирует связанность между нодами.

**Impact on plan.md:** Новый паттерн, не обозначенный в плане. Закрывает вопрос о передаче
side-channel данных (media_prompts, gen_params, shot_decisions) между нодами без явных wire-связей.

---

## [2026-06-19] HITL таймаут 48 ч — отложен

**Что изменено:** plan.md пункт 6 требует 48-часового таймаута с auto-cancel.

**Почему отложен:** `workflow.wait_condition(timeout=...)` добавляется одной строкой. Отложено
чтобы не блокировать слияние основного функционала. Нужен дизайн notification-пути (RabbitMQ?
email?), что выходит за рамки текущей итерации.

**Impact on plan.md:** Acceptance criterion "HITL 48h timeout → job auto-cancel" не закрыт.

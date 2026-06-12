# Decisions: AMPLIFY-391

> Populated during implementation. Each entry records a deviation from plan.md or a key choice made at runtime.

## 2026-06-05: Pass-through вместо нативной интеграции LiteLLM SDK

**What changed:** Не переписывали существующие интеграции template-service под LiteLLM SDK. Использовали pass-through endpoints.

**Why:** Минимальный риск регрессии. template-service использует нативный Vertex AI SDK для Veo (асинхронные операции, polling). Переписывать это под LiteLLM — отдельная задача. Pass-through позволяет получить логирование стоимости без изменения бизнес-логики.

**Impact on plan.md:** Соответствует плану. ai-gateway остался вне scope (LiteLLM его не покрывает в этом PR).

---

## 2026-06-05: SQL View вместо application-level join

**What changed:** Вместо того чтобы читать данные LiteLLM и template-service по отдельности и джойнить в коде, создали PostgreSQL view с cross-schema JOIN.

**Why:** Проще и надёжнее. EF Core `ToView()` позволяет работать с view как с обычной таблицей. Миграции не нужны для самой сущности — только DDL view. Индексы можно добавить на исходные таблицы.

**Impact on plan.md:** Соответствует плану.

---

## 2026-06-05: EF Core HasQueryFilter вместо per-query фильтра на "unknown"

**What changed:** Вместо добавления `&& x.Model != "unknown"` в каждый LINQ-запрос — применён глобальный `HasQueryFilter` на `GenerationSpendLog`.

**Why:** LiteLLM записывает polling-запросы Veo с `model = "unknown"` (нет токенов, нет стоимости, только статус-запросы). Они искажают статистику: завышают request_count, занижают avg_cpa. Глобальный фильтр нельзя "забыть" в новом query handler.

**Impact on plan.md:** Не было предусмотрено явно, но соответствует духу "корректной аналитики".

---

## 2026-06-05: Аналитика в userservice, не в отдельном микросервисе

**What changed:** Все query handlers и эндпоинты размещены в userservice.

**Why:** userservice уже знает о Projects и User — именно через них скоупятся все аналитические запросы. Создавать отдельный сервис ради CRUD-like аналитических endpoints преждевременно.

**Impact on plan.md:** Соответствует плану. Future work — при росте нагрузки вынести в отдельный микросервис.

---

## 2026-06-05: Task.WhenAll с EF Core — баг и фикс

**What changed:** Три query handler использовали `Task.WhenAll` для параллельного запуска двух EF Core запросов: `GetGlobalSpendSummaryQuery`, `GetEntityEfficiencyQuery`, `GetSpendSummaryQuery`. Заменено на последовательные `await`.

**Why:** EF Core DbContext не потокобезопасен. Одновременный `ToListAsync()` + `FirstOrDefaultAsync()` на одном экземпляре бросает `InvalidOperationException`. Фронтенд видел 500, падал в catch и показывал нули. Chart-данные (Capital Burn, Output Volume) при этом работали — их handlers не использовали `Task.WhenAll`.

**Impact on plan.md:** Не предусмотрено в плане (баг реализации). Исправлено в рамках этого же PR.

---

## 2026-06-05: Метрики AMPLIFY-368 покрыты частично

**What changed:** Из 7 концептов AMPLIFY-368 реализованы 4 на глобальном дашборде. 3 концепта остались вне scope.

**Why:** Приоритет отдан метрикам, которые напрямую зависят от данных LiteLLM (spend-based). Generation Velocity и Format Volume Velocity используют другие источники данных и требуют отдельных компонентов.

| Концепт | Причина откладывания |
|---|---|
| [Generation Velocity](../AMPLIFY-368/concepts/generation-velocity.md) | Per-project handler существует, но для глобального дашборда нужен `GetGlobalGenerationVelocityQuery` + визуализация Resource Offset (hours saved). Не является spend-метрикой — требует отдельной истории. |
| [Yield Efficiency](../AMPLIFY-368/concepts/yield-efficiency.md) | Per-project `GetSpendByTemplateQuery` есть. Нужен global handler + chart с CPA per template (scatter или bar). Фильтр: только templates с > 10 генерациями за 30 дней. |
| [Format Volume Velocity](../AMPLIFY-368/concepts/format-volume-velocity.md) | Данные есть в `job_executions` (COUNT DISTINCT template_id). Нет handler и нет дизайна компонента. Format Diversity Ratio = Output Volume ÷ Active Templates. |

**Impact on plan.md:** Acceptance criteria помечены частично выполненными; три метрики — backlog следующего PR.

---

## 2026-06-05: Template name в аналитике — отложено, выбран путь денормализации

**What changed:** Yield Efficiency и Generation Velocity per-template не реализованы на глобальном дашборде, в том числе потому что `template_id` (Guid) нечитаем без имени, а имя шаблона живёт в template-service.

**Why:** Cross-service join в query time создаёт coupling и latency. Три варианта рассмотрены — подробно в [[concepts/template-naming-in-analytics]].

**Принятое решение:** денормализация `template_name` в `job_executions` при создании job. Исторически корректно ("имя на момент запуска"), не зависит от library, работает для любых шаблонов.

**Отклонённые варианты:**
- LiteLLM metadata — покрывает только spend path, не Generation Velocity
- Library template link — продуктовое решение, требует admin UI и определяет, разрешены ли кастомные шаблоны вне library; должно решаться отдельно

**Impact on plan.md:** Yield Efficiency и Generation Velocity per-template — следующий PR после реализации денормализации.

---

## Future Work (зафиксировано, не реализовано)

- **Materialized view** — EF Core `ToView()` одинаково работает для обычного и materialized view. Разница только в DDL (`CREATE MATERIALIZED VIEW`) и необходимости `REFRESH MATERIALIZED VIEW` (pg_cron / триггер / hosted service).
- **ai-gateway через LiteLLM** — ElevenLabs и Whisper пока ходят напрямую. Подключение потребует изменения ai-gateway.
- **Отдельный analytics microservice** — если аналитика начнёт влиять на latency или требовать собственного масштабирования.

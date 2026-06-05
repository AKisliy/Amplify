# Concept: Analytics Data Layer

## Архитектура

```
template-service DB (schema: template_service)
  └── job_executions, template_runs, ...

LiteLLM DB (schema: public)
  └── litellmspendlogs (model, cost_usd, total_tokens, metadata, ...)

                    ↓ cross-schema VIEW
              generation_spend_logs
              (PostgreSQL view in userservice DB)

                    ↓ EF Core ToView()
              GenerationSpendLog entity (userservice)
```

## SQL View

Аналитика построена на PostgreSQL view, который объединяет данные из двух схем через cross-schema JOIN. Userservice-база имеет доступ к схемам `template_service` и `public` (LiteLLM) через foreign data wrapper или shared connection.

View называется `generation_spend_logs` (или `generation_spend_logs_active` с учётом фильтра по unknown).

## EF Core Mapping

Сущность `GenerationSpendLog` маппится на view через `ToView()`:

```csharp
modelBuilder.Entity<GenerationSpendLog>()
    .ToView("generation_spend_logs")
    .HasNoKey(); // view не имеет первичного ключа
```

EF Core не пытается создавать или мигрировать таблицу. View создаётся вручную через `migrationBuilder.Sql(...)`.

## Глобальный фильтр на "unknown"

LiteLLM записывает polling-запросы с `model = "unknown"` (см. [[litellm-proxy]]). Чтобы не засорять все аналитические запросы одним и тем же условием, применяем **EF Core global query filter**:

```csharp
modelBuilder.Entity<GenerationSpendLog>()
    .HasQueryFilter(x => x.Model != "unknown");
```

Фильтр применяется автоматически ко всем LINQ-запросам на этой сущности. Если нужно обойти — `IgnoreQueryFilters()`.

## Query Handlers (userservice)

Все аналитические запросы живут в `userservice/src/Application/Analytics/Queries/`.

**Per-project:**
| Handler | Endpoint | Что возвращает |
|---------|----------|----------------|
| `GetSpendSummaryQuery` | `{projectId}/spend/summary` | TotalCostUsd, TotalTokens, RequestCount, CompletedJobCount, FailedJobCount |
| `GetSpendTrendQuery` | `{projectId}/spend/trend` | Daily cost/tokens/requests |
| `GetSpendByModelQuery` | `{projectId}/spend/by-model` | Cost breakdown by model |
| `GetSpendByTemplateQuery` | `{projectId}/spend/by-template` | Cost by template |
| `GetSpendByJobQuery` | `{projectId}/spend/by-job` | Cost per job execution |
| `GetOutputVolumeQuery` | `{projectId}/jobs/volume` | Daily completed/failed jobs |

**Global (cross-project, user-scoped):**
| Handler | Endpoint | Что возвращает |
|---------|----------|----------------|
| `GetGlobalSpendSummaryQuery` | `global/spend/summary` | Агрегат по всем проектам пользователя |
| `GetGlobalSpendTrendQuery` | `global/spend/trend` | Daily trend по всем проектам |
| `GetGlobalCapitalBurnQuery` | `global/capital-burn` | (date, model, cost) — для stacked area chart |
| `GetGlobalOutputVolumeQuery` | `global/jobs/volume` | Daily completed/failed по всем проектам |
| `GetEntityEfficiencyQuery` | `global/entity-efficiency` | Per-project CPA vs total spend |

## Важный баг: Task.WhenAll с EF Core DbContext

Несколько query handlers использовали `Task.WhenAll` для параллельного запуска двух `ToListAsync()` / `FirstOrDefaultAsync()` на одном DbContext. EF Core DbContext **не потокобезопасен**: параллельные операции на одном экземпляре выбрасывают `InvalidOperationException`.

**Симптом:** handlers возвращали 500, фронтенд падал в `.catch(() => null)`, KPI-значения показывали нули.

**Исправлено:** в `GetGlobalSpendSummaryQuery`, `GetEntityEfficiencyQuery`, `GetSpendSummaryQuery` — заменено на последовательные `await`.

## Future Work

- **Materialized view** — при росте объёма данных обычный view начнёт тормозить. Materialized view в Postgres кешируется на диск. EF Core `ToView()` работает одинаково для обоих типов; нужно только поменять DDL в миграции и добавить `REFRESH MATERIALIZED VIEW` (cron или триггер).
- **Отдельный микросервис аналитики** — если аналитика начнёт влиять на latency userservice или потребует собственного масштабирования.

# Research: AMPLIFY-391

## Overview

AMPLIFY-391 реализует LiteLLM POC: единую точку проксирования всех внешних AI-вызовов. Ключевой результат — появление реальных данных о стоимости генераций в системе, на основе которых строится аналитический дашборд (метрики из AMPLIFY-368).

Архитектурная цепочка:

```
template-service → LiteLLM proxy → Vertex AI (Veo, Gemini)
                         ↓
              litellmspendlogs (public schema, Postgres)
                         ↓
              generation_spend_logs (SQL View, cross-schema)
                         ↓
              GenerationSpendLog entity (EF Core, userservice)
                         ↓
              Analytics Query Handlers (userservice CQRS)
                         ↓
              Global Analytics Dashboard (Next.js frontend)
```

**Что не охвачено в этом PR:** ai-gateway (ElevenLabs / Whisper) пока ходит к провайдерам напрямую, не через LiteLLM.

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/litellm-proxy]] | LiteLLM deployment, pass-through endpoints, prefix `/litellm` pitfall, модель "unknown" при Veo polling |
| [[concepts/analytics-data-layer]] | Cross-schema SQL view, EF Core ToView + HasQueryFilter, все query handlers, баг Task.WhenAll |
| [[concepts/global-analytics-dashboard]] | Frontend layout (6 блоков), компоненты, хуки, fallback-логика KPI, recharts TypeScript gotcha |

## Coverage Map: AMPLIFY-368 Metrics

Маппинг всех метрик из [AMPLIFY-368 research](../AMPLIFY-368/research.md) на реализацию в этом PR.

### Концепты AMPLIFY-368 (7 из 7)

| AMPLIFY-368 Concept | Статус | Query Handler | Dashboard |
|---|---|---|---|
| [Capital Burn](../AMPLIFY-368/concepts/capital-burn.md) | ✅ Реализован | `GetGlobalCapitalBurnQuery` | `GlobalCapitalBurnChart` (stacked area по моделям) |
| [CPA](../AMPLIFY-368/concepts/cpa.md) | ✅ Реализован | вычисляется на фронте из SpendTrend + OutputVolume | `GlobalCpaEfficiencyChart` + Financial KPI (Avg CPA, Arbitrage Margin) |
| [Output Volume Velocity](../AMPLIFY-368/concepts/output-volume-velocity.md) | ✅ Реализован | `GetGlobalOutputVolumeQuery` | `GlobalOutputVolumeChart` (weekly bars: completed + failed) |
| [Entity Efficiency](../AMPLIFY-368/concepts/entity-efficiency.md) | ✅ Реализован | `GetEntityEfficiencyQuery` | `GlobalEntityEfficiencyChart` (bar CPA + line TotalSpend) |
| [Generation Velocity](../AMPLIFY-368/concepts/generation-velocity.md) | ⚠️ Частично | `GetGenerationVelocityQuery` (per-project) | Не показан на глобальном дашборде. Resource Offset не визуализирован. |
| [Yield Efficiency](../AMPLIFY-368/concepts/yield-efficiency.md) | ⚠️ Частично | `GetSpendByTemplateQuery` (per-project) | Нет на глобальном дашборде. Нет chart с CPA per template. |
| [Format Volume Velocity](../AMPLIFY-368/concepts/format-volume-velocity.md) | ❌ Не реализован | — | Нет ни handler, ни компонента. |

### Дополнительные метрики из AMPLIFY-368 research.md (не имеют концепт-файлов)

| Метрика | Статус | Примечание |
|---|---|---|
| Failed Generation Overhead | ⚠️ Частично | `failedJobCount` есть в SpendSummary, но нет разбивки по стоимости failed jobs |
| Node Failure Rate By Class | ⚠️ Частично | `GetNodeFailureRateQuery` (per-project), не на глобальном дашборде |
| Regeneration Rate (HITL) | ❌ Не реализован | Нет источника данных — shot regeneration requests не хранятся как отдельные записи |
| Queue Depth & Wait Time | ❌ Не реализован | Данные есть в `job_executions` (started_at vs submitted_at), но handler не написан |

### Итог

4 из 7 концептов AMPLIFY-368 полностью реализованы на глобальном дашборде. 3 метрики (Generation Velocity, Yield Efficiency, Format Volume Velocity) есть частично или отсутствуют — кандидаты для следующего PR.

## Open Questions

- Когда стоит переходить на materialized view? (см. decisions.md — при замедлении запросов > 500ms)
- Как подключить ai-gateway через LiteLLM без нарушения MinIO-логики (ai-gateway скачивает аудио → вызывает провайдера → загружает в MinIO)?
- Format Volume Velocity: нужен ли отдельный handler или можно вычислить через COUNT DISTINCT template_id из job_executions за период?

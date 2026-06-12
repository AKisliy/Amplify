# AMPLIFY-391: LiteLLM POC

## Goal

Поднять LiteLLM как единую точку маршрутизации всех внешних AI-вызовов и на её основе построить систему трекинга затрат для аналитического дашборда.

## Context

До этой задачи каждый сервис ходил к провайдерам напрямую:
- `template-service` → Gemini, Veo (Vertex AI) напрямую
- `ai-gateway` → ElevenLabs, OpenAI Whisper напрямую

Единой точки видимости расходов не было. Langfuse не был подключён. Данные о стоимости генераций нигде не агрегировались.

Аналитика из AMPLIFY-368 (9 метрик Zone 1) требует реальных данных по стоимости на уровне модели.

## Design Decisions

1. **Pass-through endpoints** — внедряем LiteLLM без переписывания логики существующих интеграций. Сервисы продолжают использовать родные форматы запросов; LiteLLM проксирует их к провайдерам.

2. **LiteLLM в кластере** — развёртывается через Helm как отдельный под, доступен на префиксе `/litellm` домена.

3. **Analytics через SQL view** — вместо application-level join строим view, объединяющий таблицы `template-service` и `public` (схема LiteLLM) через cross-schema JOIN в Postgres. Userservice читает данные через EF Core, маппируя сущность на этот view.

4. **Аналитические обработчики в userservice** — userservice ближе всего к сущностям "проект" и "пользователь", поэтому все query handlers живут там.

5. **Обогащение метаданных в template-service** — при отправке HTTP-запроса в LiteLLM в `client.py` прокидываются метаданные (run_id, project_id и др.), которые LiteLLM кладёт в `spendlog_metadata`.

## Acceptance Criteria

- [x] LiteLLM задеплоен в кластере, запросы из template-service проходят через него
- [x] template-service обогащает запросы метаданными (run_id, project_id)
- [x] SQL view `generation_spend_logs` объединяет данные LiteLLM и template-service
- [x] Userservice читает view через EF Core (`GenerationSpendLog` entity → `ToView()`)
- [x] Реализованы query handlers: SpendSummary, SpendTrend, SpendByModel, CapitalBurn, OutputVolume, EntityEfficiency (global + per-project)
- [x] Глобальный аналитический дашборд отрисован во фронтенде (Capital Burn, CPA Efficiency, Output Volume, Entity Efficiency)
- [ ] Generation Velocity — global handler + Resource Offset visualization
- [ ] Yield Efficiency — global handler + CPA per template chart
- [ ] Format Volume Velocity — handler + Format Diversity Ratio

## Out of Scope

- Полноценная интеграция Langfuse (observability pipeline) — отдельная задача
- ai-gateway через LiteLLM — требует изменения ai-gateway; отложено
- Materialized view для оптимизации запросов — см. future work в decisions.md

# Concept: LiteLLM Proxy

## Что это

LiteLLM — open-source прокси, который принимает запросы в форматах разных провайдеров (OpenAI-compatible, Vertex AI, ElevenLabs и др.) и маршрутизирует их к реальным API. Автоматически логирует стоимость каждого вызова в собственные таблицы (`litellm_spendlogs` в схеме `public`).

## Как развёрнут в кластере

- Задеплоен через Helm (см. `litellm/values.stage.yaml`)
- Доступен внутри кластера напрямую, снаружи — через Ingress с префиксом `/litellm`

## Pass-through endpoints

Вместо полного переписывания интеграций используем [LiteLLM pass-through](https://docs.litellm.ai/docs/pass_through/vertex_ai):

```
template-service → POST /litellm/vertex-ai/... → LiteLLM → Vertex AI (Veo, Gemini)
```

Сервис не знает, что говорит с прокси — он продолжает использовать родной формат Vertex AI SDK. LiteLLM перехватывает запрос, логирует стоимость и проксирует его дальше.

## Проблема с префиксом `/litellm`

**Ловушка:** при установке base path `/litellm` в Ingress перестали работать pass-through endpoints. Причина: pass-through endpoint в LiteLLM строит URL для проксирования, не учитывая внешний prefix. В результате запросы уходили на `https://provider.com/litellm/...` вместо `https://provider.com/...`.

**Решение:** конфигурировать LiteLLM с явным `server_root_path` или учитывать путь при формировании запросов в сервисах.

## Метаданные при запросах

template-service прокидывает метаданные в каждом запросе через `client.py` (enrichment при отправке HTTP):

```python
# Добавляется в заголовки / тело запроса
metadata = {
    "run_id": run_id,
    "project_id": project_id,
    "template_id": template_id,
}
```

LiteLLM сохраняет их в поле `metadata` в `litellmspendlogs`. После JOIN-а с таблицами template-service они становятся доступны для аналитики.

## Модель "unknown"

LiteLLM помечает некоторые запросы моделью `"unknown"` — это происходит при **polling-запросах** (проверка статуса асинхронной генерации, например Veo). В таких запросах нет информации о модели, реальных токенов нет, стоимость нулевая.

Эти записи искажают статистику: 1 реальный запрос + 9 polling = завышенный `request_count`, заниженный средний CPA.

**Решение:** EF Core `HasQueryFilter` на `GenerationSpendLog` — см. [[analytics-data-layer]].

## Future Work

- Подключить `ai-gateway` через LiteLLM (ElevenLabs, Whisper) — требует изменения ai-gateway
- Включить Langfuse как observability backend в LiteLLM config

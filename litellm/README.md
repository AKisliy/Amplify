# LiteLLM Proxy

LiteLLM proxy — единая точка входа для всех AI-провайдеров (Vertex AI, ElevenLabs, OpenAI).
В кластере деплоится через Helm chart `ghcr.io/berriai/litellm-database`.

## Структура

```
litellm/
  values.yaml          # базовые параметры Helm chart (image, envVars, volumes)
  values.stage.yaml    # конфиг моделей и настройки для stage-окружения
  values.dev.yaml      # dev-окружение
  values.prod.yaml     # prod-окружение
  local/
    config.yaml        # пример конфига для локального запуска (без Postgres)
    sa-key.json        # placeholder — заменить реальным ключом (см. ниже)
```

## Локальный запуск для разработки

Позволяет тестировать интеграцию с AI API без деплоя в кластер.

### 1. Получить SA-ключ

```bash
kubectl get secret litellm-secret -n test-env \
  -o jsonpath='{.data.sa-key\.json}' | base64 -d > litellm/local/sa-key.json
```

> `litellm/local/sa-key.json` добавлен в `.gitignore` — реальный ключ не попадёт в репозиторий.

### 2. (Опционально) Подправить конфиг

Скопировать шаблон и отредактировать при необходимости:

```bash
cp litellm/local/config.yaml litellm/local/config.local.yaml
```

`config.local.yaml` тоже в `.gitignore`. Если никаких изменений не нужно — можно использовать `config.yaml` напрямую.

### 3. Запустить через docker-compose

```bash
cd litellm/local
docker-compose up
```

Поднимается LiteLLM proxy + PostgreSQL (нужна для UI и `store_model_in_db`).

- Proxy API: `http://localhost:4000`
- UI: `http://localhost:4000/ui` (логин: master key = `sk-1234`)

Проверка:
```bash
curl http://localhost:4000/v1/models
```

Остановить и удалить контейнеры (данные БД сохраняются в volume):
```bash
docker-compose down
```

Полный сброс вместе с БД:
```bash
docker-compose down -v
```

### 4. Настроить сервис на локальный proxy

В `.env` нужного сервиса (например, `template-service/backend_template/engine/.env`):

```env
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=sk-1234
```

### Отличия от кластерного конфига

| | Локально | Кластер |
|---|---|---|
| БД | нет (конфиг из файла) | Neon PostgreSQL |
| `store_model_in_db` | нет | `true` |
| Langfuse | отключён | включён |
| SA-ключ | файл на диске | K8s Secret + volume mount |
| Аутентификация | без master key | `LITELLM_MASTER_KEY` из secret |

## Деплой в кластер

```bash
# Удалить старый migration job (он immutable)
kubectl delete job litellm-migrations -n test-env --ignore-not-found

# Применить
helmfile --environment stage sync --selector app=litellm
```

После изменения `values.stage.yaml` (модели, настройки) нужен рестарт пода:
```bash
kubectl rollout restart deployment/litellm -n test-env
```

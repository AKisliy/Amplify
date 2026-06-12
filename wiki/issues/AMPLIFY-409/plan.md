# AMPLIFY-409: ElevenLabs pass-through via LiteLLM

## Goal
Маршрутизировать вызовы `speech-to-speech` ElevenLabs через ai-gateway → LiteLLM pass-through.

## Context
- `ai-gateway` делегирует API-вызовы в LiteLLM proxy; MinIO-логика остаётся в ai-gateway
- LiteLLM поддерживает pass-through эндпоинты (`general_settings.pass_through_endpoints`), которые проксируются напрямую к провайдеру без обёртки OpenAI-совместимого API

## Design Decisions
- Использовать pass-through маршрут `/elevenlabs/v1/speech-to-speech/*` вместо стандартного LLM API
- Права на маршрут настраиваются в **API-ключе**, а не только в конфиге сервера

## Acceptance Criteria
- [x] POST /elevenlabs/v1/speech-to-speech/* через LiteLLM возвращает 200
- [x] ai-gateway корректно проксирует запрос и загружает результат в MinIO

## Out of Scope
- Изменение схемы cost tracking для character-based биллинга ElevenLabs (отдельный issue)

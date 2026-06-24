# Node Result Cache

## Что делает ComfyUI

`comfy_execution/caching.py` вычисляет хэш входов ноды перед выполнением.
Если хэш совпадает с предыдущим запуском — нода пропускается, возвращается
кэшированный результат. Кэш **in-memory**: умирает при рестарте пода,
не делится между воркерами.

Ключевое отличие алгоритма: ComfyUI получает кэш-ключ из **нерезолвнутых ссылок** —
ему приходится обходить всё дерево предков, потому что к моменту вычисления ключа
входы ещё не раскрыты. В нашей реализации воркфлоу разрезолвит все входы до вызова
активности, поэтому ключ строится из конкретных значений — обход графа не нужен.

## Frontend: реализация Cache Zone

Cache Zone — это специальный узел типа `cache-zone` на канвасе ReactFlow. Реализован в
`frontend/src/features/canvas/components/CacheZoneNode.tsx` с компонентом `NodeResizer`.

### Алгоритм простановки флага `can_use_cache`

`useEffect([nodes, setNodes])` в `page.tsx` реактивно тегирует ноды:

```tsx
useEffect(() => {
  const hasZone = nodes.some((n) => n.type === "cache-zone");
  // ...
  setNodes((nds) => {
    const currentZones = nds.filter((n) => n.type === "cache-zone");
    // AABB intersection check
    const inZone = currentZones.some((z) => {
      const zW = z.measured?.width ?? (Number(z.style?.width) || 400);
      const zH = z.measured?.height ?? (Number(z.style?.height) || 300);
      // ...
    });
  });
}, [nodes, setNodes]);
```

### Важные детали реализации (два баги, которые мы поймали)

**1. Stale closure в `setNodes`**

`zones` нельзя вычислять снаружи коллбека `setNodes((nds) => {...})` — это был бы
снимок `nodes` из предыдущего рендера. Внутри коллбека React гарантирует актуальный `nds`.
Поэтому `currentZones` вычисляется из `nds` внутри функционального апдейта.

**2. Размер зоны после ресайза: `measured`, не `style`**

`NodeResizer` обновляет `node.style.width/height` при ресайзе, но ReactFlow v12 также
заполняет `node.measured.width/height` через ResizeObserver — и это всегда актуальные
DOM-размеры. Читать размер зоны нужно из `measured` в первую очередь:

```tsx
const zW = z.measured?.width ?? (Number(z.style?.width) || 400);
const zH = z.measured?.height ?? (Number(z.style?.height) || 300);
```

Если читать только из `style` — ноды, попадающие в растянутую зону, не получают иконку Zap.

---

## Управление кэшем

### Запись — всегда

Каждый ран записывает результат любой ноды в кэш — без условий, без UI-флагов.
Кэш растёт автоматически и всегда актуален.

### Чтение — через UI-зону

Пользователь рисует **зону кэша** на канвасе, охватывая нужные ноды.
Фронтенд проставляет флаг `can_use_cache: true` в `_meta` каждой ноды внутри зоны.

Формат в graph JSON:

```json
{
  "abc123": {
    "class_type": "GeminiNode",
    "inputs": { "prompt": "Напиши сценарий..." },
    "_meta": { "can_use_cache": true }
  }
}
```

- `can_use_cache=true` → перед вызовом API смотрим в кэш; при попадании возвращаем результат
- `can_use_cache=false` (дефолт) → нода всегда выполняется, запись в кэш всё равно происходит

### Глобальный флаг (конфиг сервиса)

В `config.py` добавляется флаг `cache_enabled: bool = True`, аналогично тому как
ComfyUI позволяет глобально переключить стратегию кэширования.

При `cache_enabled=False`:
- запись в кэш отключена
- чтение из кэша отключено
- UI-зоны игнорируются

Это позволяет отключить кэш для отладки или на окружениях, где нежелательно
переиспользование результатов, без изменений в графах.

## Архитектура: как флаг доходит до активности

```
graph JSON (_meta.can_use_cache)
        ↓
GraphWorkflow читает флаг при построении NodeActivityInput
        ↓
NodeActivityInput.can_use_cache: bool
        ↓
execute_node (dynamic activity) проверяет флаг
```

В `NodeActivityInput` добавляется поле:

```python
@dataclass
class NodeActivityInput:
    ...
    can_use_cache: bool = False
```

В активности (`activities/node.py`):

```python
cache_key = _compute_cache_key(inp.class_type, inp.resolved)

# Чтение — только если нода в UI-зоне И кэш глобально включён
if inp.can_use_cache and settings.cache_enabled:
    cached = await cache_repo.get(cache_key)
    if cached is not None:
        await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "CACHED")
        return cached

result = ... # вызов API

# Запись — всегда (если кэш глобально включён)
if settings.cache_enabled:
    await cache_repo.set(cache_key, result, ttl_days=7)
```

## Ключ кэша

```python
import hashlib, json

def _compute_cache_key(class_type: str, resolved: dict) -> str:
    payload = json.dumps(
        {"class_type": class_type, "inputs": resolved},
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode()).hexdigest()
```

`resolved` к этому моменту содержит конкретные значения (строки, числа, MinIO UUID).
Обхода графа не требуется — это прямое следствие того, что воркфлоу разрезолвил
все ссылки до запуска активности (см. [[concepts/temporal-dag-execution]]).

**UUID входных файлов включаются в ключ как есть.** Если пользователь загружает
"тот же" файл повторно — он получит новый UUID → промах кэша. Это корректное
поведение: мы не сравниваем содержимое файлов.

## Что кэшируем

Кэшируем **MinIO UUID** — не бинарные данные. Все тяжёлые артефакты (видео,
изображения, аудио) уже лежат в MinIO; нода возвращает их UUID. UUID не протухают —
MinIO хранит объекты до явного удаления.

```json
// Пример записи в кэше для VeoVideoGenerationNode
{
  "video_url": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

## Схема PostgreSQL

```sql
CREATE TABLE node_result_cache (
    input_hash  TEXT        PRIMARY KEY,
    class_type  TEXT        NOT NULL,
    output      JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_node_result_cache_expires ON node_result_cache (expires_at);
```

TTL: **7 дней** по умолчанию (фиксировано в коде, будет пересмотрено при накоплении
данных об использовании).

Очистка истёкших записей — периодический фоновый процесс или pg_cron:

```sql
DELETE FROM node_result_cache WHERE expires_at < now();
```

## Область видимости кэша

Кэш работает **cross-run и cross-worker** одновременно:

| Сценарий | Результат |
|---|---|
| Тот же граф, те же входы, второй запуск | Попадание — ноды с `can_use_cache=true` пропускаются |
| Два одинаковых узла в одном графе | Попадание — второй получит результат первого из PostgreSQL |
| Другой воркер-под | Попадание — кэш в общей БД |
| Под перезапустился в середине запуска | Попадание — завершённые ноды не перевыполняются |

## Cache abstraction

Кэш скрыт за `Protocol` — бэкенд подключается через DI при старте воркера:

```python
class NodeResultCache(Protocol):
    async def get(self, key: str) -> dict | None: ...
    async def set(self, key: str, value: dict, ttl_days: int) -> None: ...

class PostgresNodeResultCache:   ...  # текущая реализация
class RedisNodeResultCache:      ...  # когда Redis войдёт в стек
```

## PostgreSQL достаточен при целевой нагрузке

При 100 одновременных заданиях (~500 одновременных обращений к кэшу пиково)
PRIMARY KEY-запросы через asyncpg не являются узким местом. Разница в latency
PostgreSQL vs Redis (~2-5 мс против <1 мс) не имеет значения, когда сама активность
вызывает Veo (~2 мин) или Gemini (~3 с).

## Где Redis нужен (не для кэша)

Redis не нужен для node result cache при текущей нагрузке, но нужен для:

**API rate limiting** — атомарный `INCR` для квот RPM/TPM по Gemini, Veo, ElevenLabs:
```python
key = f"veo:rpm:{project_id}:{current_minute()}"
count = await redis.incr(key)
await redis.expire(key, 60)
if count > VEO_RPM_LIMIT:
    raise RateLimitError()
```

**Distributed locks** — предотвращение дублирующих submissions:
```python
async with redis.lock(f"template:{template_id}:running", timeout=300):
    await temporal_client.start_workflow(...)
```

| Задача | Бэкенд |
|---|---|
| Node result cache | PostgreSQL (сейчас), Redis (если войдёт в стек) |
| API rate limiting | Redis — основная причина добавить его |
| Distributed locks | Redis |
| Состояние воркфлоу | Temporal DB — не трогать |

# Decisions: AMPLIFY-416

> Populated during implementation. Each entry records a deviation from plan.md or a key choice made at runtime.

## 2026-06-15: Семантические цвета провайдеров убраны полностью

**What changed:** Первоначальный план оставлял `m.includes("veo")` → rose, `m.includes("eleven")` → sky и т.д. В итоге убрали все семантические привязки: `modelColor` — чистый djb2-хэш для любого имени.

**Why:** Семантика цветов (veo = rose) была условностью Figma-макетов, в продукте не несёт смысла. Хэш проще, универсальнее и не требует обновления при появлении новых провайдеров.

**Impact on plan.md:** Соответствует обновлённому plan.md (Design Decisions → Цвета моделей).

<!-- ## [YYYY-MM-DD] [Short title]
**What changed:** ...
**Why:** ...
**Impact on plan.md:** ... -->

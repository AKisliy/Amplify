---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
---

# UI Components

## Приоритет выбора компонента

Перед созданием любого UI-элемента строго следуй этому порядку:

**1. Проверь уже установленные shadcn/ui компоненты**
Загляни в `frontend/components/ui/` — используй то, что уже есть.

**2. Нет нужного — доустанови из shadcn/ui**
```bash
npx shadcn@latest add <component-name>
```
Доступные компоненты: https://ui.shadcn.com/docs/components

**3. Кастомный компонент — только если shadcn/ui не покрывает функциональность**
Если всё же пишешь кастомный компонент — используй внутри shadcn/ui примитивы (Button, Input и т.д.), а не нативные HTML-элементы.

## Примеры готовых компонентов shadcn/ui

Перед написанием своего кода убедись, что этого нет в shadcn/ui:
`accordion`, `alert`, `avatar`, `badge`, `calendar`, `card`, `checkbox`,
`combobox`, `command`, `data-table`, `date-picker`, `dialog`, `drawer`,
`dropdown-menu`, `form`, `input`, `label`, `pagination`, `popover`,
`progress`, `radio-group`, `select`, `separator`, `sheet`, `skeleton`,
`slider`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `tooltip`
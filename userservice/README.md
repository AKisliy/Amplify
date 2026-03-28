[![Open in Swagger Editor](https://img.shields.io/badge/Open_in-Swagger_Editor-orange?logo=swagger)](https://editor.swagger.io/?url=https://raw.githubusercontent.com/AKisliy/Amplify/refs/heads/main/userservice/src/Web/wwwroot/api/specification.json)
[![User-service CI/CD](https://github.com/AKisliy/Amplify/actions/workflows/userservice-deploy.yaml/badge.svg)](https://github.com/AKisliy/Amplify/actions/workflows/userservice-deploy.yaml)

# UserService

Микросервис управления пользователями, проектами и амбассадорами платформы **Amplify** — AI-инструмента для автоматизации создания UGC-контента в социальных сетях.

## Контекст платформы

Amplify — это многосервисная платформа автоматизации контента. UserService является центральным сервисом для управления пользователями и их данными:

```
Frontend (Next.js) ──→ UserService (5050) ──→ PostgreSQL
                            │
                            ├──→ RabbitMQ ──→ WebSocket Gateway ──→ Frontend (SignalR)
                            └──→ Media-Ingest Service (файлы и ассеты)
```

| Сервис              | Технологии             | Порт  | Назначение                           |
|---------------------|------------------------|-------|--------------------------------------|
| **userservice**     | C# .NET 9, Clean Arch  | 5050  | Пользователи, проекты, амбассадоры   |
| publisher           | C# .NET 9              | 6060  | Публикации в соцсети                 |
| media-ingest        | C# .NET 9              | 5070  | Загрузка файлов, MinIO               |
| websocket-gateway   | C# .NET 9, SignalR     | 5000  | Реал-тайм обновления                 |
| template-service    | Python FastAPI          | 8000  | Генерация контента через AI          |
| frontend            | Next.js 16 / React 19  | 3000  | Веб-интерфейс                        |

## Доменная модель

**Проект (Project)** — рабочая единица пользователя. Содержит название, описание, фото, ссылается на пользователя-владельца.

**Амбассадор (Ambassador)** — AI-персонаж внутри проекта. Каждый проект имеет ровно одного амбассадора. Имеет имя, биографию, описание голоса, фото профиля, приоритет и паттерны поведения.

**Ассеты проекта (ProjectAsset)** — медиафайлы, сгенерированные или привязанные к проекту. Разделяются по времени жизни: `Intermediate` (временные) и `Permanent` (постоянные).

**Пользователь (ApplicationUser)** — расширенный пользователь ASP.NET Core Identity с подтверждением email.

## Технологический стек

- **Runtime**: .NET 9.0, ASP.NET Core (Minimal APIs)
- **База данных**: PostgreSQL 16 + Entity Framework Core 9.0
- **CQRS**: MediatR + FluentValidation
- **Аутентификация**: ASP.NET Core Identity + JWT (RSA-256)
- **Брокер сообщений**: RabbitMQ + MassTransit
- **API-документация**: NSwag (OpenAPI 3)
- **Контейнеризация**: Docker (multi-stage build)
- **Оркестрация**: Kubernetes + Helm + Helmfile
- **Наблюдаемость**: OpenTelemetry (auto-instrumentation)
- **Email**: Resend API
- **Тестирование**: NUnit 3, Moq, Shouldly, Testcontainers, Respawn

## Архитектура

Сервис построен по принципам **Clean Architecture**:

```
src/
├── Domain/           # Сущности, события, перечисления, константы
├── Application/      # CQRS команды/запросы (MediatR), бизнес-логика
├── Infrastructure/   # EF Core, Identity, MassTransit, HTTP-клиенты
└── Web/              # ASP.NET Core Minimal APIs, Endpoints, Program.cs
```

## HTTP API

Базовый путь: `/api` (в Kubernetes: `/userservice/api`)

### Аутентификация — `/api/auth`

| Метод  | Путь                            | Описание                             | Auth |
|--------|---------------------------------|--------------------------------------|------|
| POST   | `/register`                     | Регистрация пользователя             | —    |
| GET    | `/confirm-email`                | Подтверждение email по коду          | —    |
| POST   | `/login`                        | Вход, возвращает JWT + refresh token | —    |
| POST   | `/logout`                       | Выход                                | ✓    |
| POST   | `/refresh`                      | Обновление access-токена             | —    |
| POST   | `/forgot-password`              | Запрос сброса пароля                 | —    |
| POST   | `/reset-password`               | Сброс пароля по коду                 | —    |
| GET    | `/.well-known/jwks.json`        | Публичные ключи (JWKS)               | —    |
| GET    | `/.well-known/openid-configuration` | OpenID конфигурация              | —    |

### Проекты — `/api/projects`

| Метод  | Путь      | Описание                        | Auth |
|--------|-----------|---------------------------------|------|
| POST   | `/`       | Создать проект                  | ✓    |
| GET    | `/`       | Список проектов пользователя    | ✓    |
| GET    | `/{id}`   | Получить проект по ID           | ✓    |
| PUT    | `/{id}`   | Обновить проект                 | ✓    |
| DELETE | `/{id}`   | Удалить проект                  | ✓    |

### Амбассадоры — `/api/ambassadors`

| Метод  | Путь                       | Описание                          | Auth |
|--------|----------------------------|-----------------------------------|------|
| POST   | `/`                        | Создать амбассадора               | ✓    |
| GET    | `/{id}`                    | Получить амбассадора по ID        | ✓    |
| PUT    | `/{id}`                    | Обновить амбассадора              | ✓    |
| DELETE | `/{id}`                    | Удалить амбассадора               | ✓    |
| GET    | `/{id}/images`             | Список изображений амбассадора    | ✓    |
| POST   | `/{id}/images`             | Добавить изображение              | ✓    |
| DELETE | `/{id}/images/{imageId}`   | Удалить изображение               | ✓    |

### Ассеты проектов — `/api/project-assets`

| Метод | Путь    | Описание                                                                 | Auth |
|-------|---------|--------------------------------------------------------------------------|------|
| GET   | `/{id}` | Ассеты проекта (cursor-based pagination; query params: `cursor`, `pageSize`, `lifetime`) | ✓    |

### Health check

| Метод | Путь      | Описание     |
|-------|-----------|--------------|
| GET   | `/health` | Liveness/readiness проверка |

## Запуск локально

### Зависимости

```bash
# PostgreSQL + RabbitMQ через docker-compose
docker-compose up -d
```

### Конфигурация

`appsettings.Development.json` (пример):

```json
{
  "ConnectionStrings": {
    "UserServiceDb": "Host=localhost;Port=6432;Database=userservice;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Issuer": "UserServiceDev",
    "Audience": "UserServiceDevUsers",
    "PrivateKeyPem": "..."
  },
  "RabbitMQ": { "Url": "amqp://guest:guest@localhost:5672" }
}
```

### Запуск приложения

```bash
cd userservice/src/Web
dotnet ef database update
dotnet run
```

Swagger UI доступен по адресу: `https://localhost:5001`

Дефолтный администратор (только в Development): `administrator@localhost` / `Administrator1!`

### Запуск тестов

```bash
# Требуется запущенный Docker (Testcontainers поднимает PostgreSQL автоматически)
dotnet test tests/Application.FunctionalTests/
dotnet test tests/Application.UnitTests/
dotnet test tests/Domain.UnitTests/
```

---

## Соответствие требованиям

### Блок 1 — Базовые требования (4 балла)

#### 1.1 Аутентификация и контроль доступа к API

Реализована на базе **ASP.NET Core Identity** + **JWT (RSA-256)**:

- `src/Infrastructure/Identity/JwtTokenGenerator.cs` — генерация JWT с RSA-подписью
- `src/Infrastructure/Identity/IdentityService.cs` — регистрация, логин, управление пользователями
- `src/Domain/Constants/Roles.cs` и `Policies.cs` — роли и политики авторизации
- Все бизнес-эндпоинты защищены `RequireAuthorization()`
- Политика `CanPurge` требует роль `Administrator`
- Кастомный `AuthorizationBehaviour` в MediatR-пайплайне проверяет права на уровне команд
- `src/Infrastructure/Identity/UserContext.cs` — извлечение `UserId` из JWT-клаймов для текущего пользователя
- JWKS-эндпоинт (`/.well-known/jwks.json`) для публичного распределения ключей

#### 1.2 HTTP API (минимум четыре бизнес-метода)

Реализовано через **ASP.NET Core Minimal APIs**:

- `src/Web/Endpoints/Projects.cs` — CRUD для проектов (5 методов)
- `src/Web/Endpoints/Ambassadors.cs` — CRUD для амбассадоров (4 метода + управление изображениями)
- `src/Web/Endpoints/Auth.cs` — аутентификация (9 методов)
- `src/Web/Endpoints/ProjectAssets.cs` — получение ассетов
- `src/Web/Endpoints/AmbassadorImages.cs` — управление изображениями

Итого бизнес-методов (только Projects + Ambassadors): **9 эндпоинтов**.

#### 1.3 Тесты (unit и функциональные)

**Функциональные тесты** (`tests/Application.FunctionalTests/`):
- `Ambassadors/` — `CreateAmbassadorTests`, `GetAmbassadorTests`, `UpdateAmbassadorTests`, `DeleteAmbassadorTests`
- `Projects/` — `CreateProjectTests`, `GetProjectTests`, `UpdateProjectTests`, `DeleteProjectTests`
- `Auth/` — тесты аутентификации
- Используют **WebApplicationFactory** + **Testcontainers** (реальный PostgreSQL в Docker)
- Изоляция тестов через **Respawn** (сброс БД между тестами)

**Unit-тесты** (`tests/Application.UnitTests/`):
- Тесты доменных сущностей и Application-логики без зависимостей

**Конфигурация для тестов**: `tests/Application.FunctionalTests/appsettings.json`

#### 1.4 Внешняя БД для хранения данных

**PostgreSQL 16** — основная БД.

- Схема `userservice` содержит: `asp_net_users`, `projects`, `ambassadors`, `ambassador_images`, `project_assets`, `data_protection_keys`
- `src/Infrastructure/Data/ApplicationDbContext.cs` — основной DbContext (наследует `IdentityDbContext`)
- Конфигурации маппинга: `src/Infrastructure/Data/Configurations/`
- Подключение через строку `ConnectionStrings:UserServiceDb`

#### 1.5 Версионирование схемы БД

Схема создаётся и версионируется через **EF Core Migrations**:

| Миграция | Дата | Содержание |
|----------|------|------------|
| `20260214183435_Init` | 14.02.2026 | Начальная схема: пользователи, проекты, амбассадоры |
| `20260306184319_AddDataProtectionKeys` | 06.03.2026 | Ключи защиты данных |
| `20260310124107_AddProfileImageToAmbassador` | 10.03.2026 | Поле `profile_image_id` у амбассадора |
| `20260317181058_AddVoiceDescriptionToAmbassador` | 17.03.2026 | Поле `voice_description` |
| `20260318142714_AddProjectAssets` | 18.03.2026 | Таблица `project_assets` |

Применение миграций при старте: `src/Infrastructure/Data/ApplicationDbContextInitialiser.cs`

В Kubernetes миграции запускаются отдельным Job'ом до старта приложения: `charts/templates/migration-job.yaml`

#### 1.6 Схема БД отражается в код при сборке

В `Dockerfile` есть отдельный `bundle` target, который при сборке Docker-образа выполняет `dotnet ef migrations bundle`. Эта команда:
1. Компилирует проект
2. Сравнивает EF-модели с актуальными миграциями
3. Если модели и миграции расходятся — **сборка упадёт с ошибкой**

```dockerfile
# Dockerfile — target bundle
FROM build AS bundle
RUN dotnet tool install --global dotnet-ef
RUN dotnet ef migrations bundle \
    --project src/Infrastructure/Infrastructure.csproj \
    --startup-project src/Web/Web.csproj \
    -o /app/bundle/efbundle
```

---

### Блок 2 — Инфраструктура (4 балла)

#### 2.1 Логирование

- **Стандартный `ILogger`** из `Microsoft.Extensions.Logging` подключён по всему приложению
- Уровни логирования в `appsettings.json`: `Default: Information`, `Microsoft.*: Warning`

В Kubernetes логи собираются через **OpenTelemetry Collector** с помощью автоинструментирования (см. п. 2.4).

#### 2.2 Метрики

В Kubernetes к поду применяется OpenTelemetry **auto-instrumentation**:

```yaml
# charts/templates/deployment.yaml
annotations:
  instrumentation.opentelemetry.io/inject-dotnet: "true"
```

Оператор OpenTelemetry автоматически инжектирует в .NET-процесс агент, который:
- Собирает **HTTP-метрики** (latency, RPS, error rate)
- Собирает **runtime метрики** (CPU, память, GC, thread pool)
- Отправляет данные в OpenTelemetry Collector → Prometheus / Grafana

Эндпоинт `/health` используется как liveness и readiness probe:
```yaml
livenessProbe:
  httpGet:
    path: /userservice/health
readinessProbe:
  httpGet:
    path: /userservice/health
```

#### 2.3 Запуск в Kubernetes

Helm-чарт расположен в `charts/`:

```
charts/
├── Chart.yaml
├── values.yaml
├── envs/
│   ├── values.stage.yaml
│   └── values.prod.yaml
└── templates/
    ├── deployment.yaml      
    ├── service.yaml         # ClusterIP Service
    ├── configmap.yaml       # Конфигурация приложения
    ├── secrets.yaml         # Секреты (JWT ключ, строки подключения)
    ├── serviceaccount.yaml  # ServiceAccount + RBAC
    ├── virtualservice.yaml  # Istio VirtualService (роутинг, retry, timeout)
    └── migration-job.yaml   # Kubernetes Job для применения миграций
```

---

### Блок 3 — CI/CD и документация

#### 3.1 CI/CD

GitHub Actions workflow: `.github/workflows/deploy-pr.yaml`

**Триггер**: PR в `main` при изменениях в `userservice/**`

**Pipeline (при PR в main)**:
1. `build` — сборка: `dotnet restore` + `dotnet build -c Release`
2. `push-to-registry` — Docker-образ публикуется в Docker Hub (`akisliy/amplify-userservice:{sha}` и `:latest`)
3. `deploy` (manual trigger) — деплой в Kubernetes через Helmfile

**Уведомления в Telegram** (`.github/workflows/telegram-notification.yaml`):
- При открытии PR в `main` — бот отправляет сообщение в Telegram с именем автора, списком затронутых сервисов и ссылкой на PR
- При успешном мерже — отдельное уведомление о слиянии
- Конфигурация через секреты: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

Статус последней сборки отображается в бейдже в заголовке README:

[![User-service CI/CD](https://github.com/AKisliy/Amplify/actions/workflows/userservice-deploy.yaml/badge.svg)](https://github.com/AKisliy/Amplify/actions/workflows/userservice-deploy.yaml)

#### 3.2 Swagger-документация

API-документация генерируется через **NSwag** (OpenAPI 3):

- Конфигурация: `src/Web/config.nswag`
- Спецификация: `src/Web/wwwroot/api/specification.json` (генерируется при сборке в Debug)

Документированы **все** API-методы, включая схемы запросов/ответов и требования к авторизации (Bearer JWT).

Открыть спецификацию в Swagger Editor:

[![Open in Swagger Editor](https://img.shields.io/badge/Open_in-Swagger_Editor-orange?logo=swagger)](https://editor.swagger.io/?url=https://raw.githubusercontent.com/AKisliy/Amplify/refs/heads/main/userservice/src/Web/wwwroot/api/specification.json)
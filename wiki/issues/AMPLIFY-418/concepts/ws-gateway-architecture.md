# ws-gateway: Clean Architecture Restructure

## Current State

Single `Web` project with everything co-located:
- `Web/Consumers/` — MassTransit consumers (infrastructure code in web layer)
- `Web/State/` — in-memory state managers
- `Web/Hubs/`, `Web/Receivers/` — SignalR
- `Web/Broker/`, `Web/Configuration/` — wiring

## Target Structure

```
websocket-gateway/src/
├── Contracts/                          ← unchanged (RabbitMQ message contracts)
├── Domain/
│   ├── Common/BaseEntity.cs
│   └── Entities/
│       └── NotificationSettings.cs    ← user_id, telegram_chat_id, notify_* flags
├── Application/
│   ├── Common/
│   │   └── Interfaces/
│   │       ├── IApplicationDbContext.cs
│   │       ├── ITelegramNotifier.cs      ← SendMessageAsync(chatId, text)
│   │       └── IUserPresenceChecker.cs   ← IsOnline(userId): bool
│   ├── State/                            ← moved from Web/State/
│   │   ├── JobNotificationStateManager.cs
│   │   └── NodeNotificationStateManager.cs
│   ├── NotificationSettings/
│   │   ├── Commands/
│   │   │   ├── UpdateSettings/UpdateSettingsCommand.cs
│   │   │   ├── GenerateLinkToken/GenerateLinkTokenCommand.cs
│   │   │   └── ConfirmTelegramLink/ConfirmTelegramLinkCommand.cs
│   │   └── Queries/
│   │       └── GetSettings/GetSettingsQuery.cs
│   └── DependencyInjection.cs
├── Infrastructure/
│   ├── Data/
│   │   ├── ApplicationDbContext.cs
│   │   ├── Configurations/NotificationSettingsConfiguration.cs
│   │   └── Migrations/
│   ├── Broker/
│   │   └── Consumers/                  ← moved from Web/Consumers/
│   │       ├── AssetRegisteredConsumer.cs
│   │       ├── GraphCompletedConsumer.cs
│   │       ├── NodeExecutionStatusChangedConsumer.cs
│   │       ├── PublicationStatusChangedConsumer.cs
│   │       └── VideoEditingStepChangedConsumer.cs
│   ├── Telegram/
│   │   ├── TelegramBotNotifier.cs      ← ITelegramNotifier impl
│   │   ├── TelegramLinkTokenCache.cs   ← IMemoryCache, TTL ~10 min
│   │   └── TelegramOptions.cs          ← BotToken, BotUsername, WebhookUrl
│   ├── SignalR/
│   │   └── SignalRUserPresenceChecker.cs ← IUserPresenceChecker impl via IHubContext
│   └── DependencyInjection.cs
└── Web/
    ├── Endpoints/
    │   ├── NotificationsEndpoints.cs   ← GET/PATCH /api/notifications/settings
    │   └── TelegramWebhookEndpoint.cs  ← POST /api/telegram/webhook
    ├── Hubs/MainHub.cs
    ├── Receivers/IClientReceiver.cs
    ├── Infrastructure/
    │   ├── Auth/ServiceCollectionExtensions.cs
    │   ├── DependencyInjection.cs
    │   └── CustomExceptionHandler.cs
    └── Program.cs
```

## Project References

```
Domain       ← (no deps)
Contracts    ← (no deps)
Application  ← Domain, Contracts
Infrastructure ← Application, Contracts
Web          ← Infrastructure, Application
```

## Key Design Notes

### IUserPresenceChecker
Abstracts SignalR from Application layer. Implementation wraps `IHubContext<MainHub>` and
checks connected user set. Used in consumers: if `notify_only_when_offline = true` and
`IsOnline(userId) = true` → skip Telegram send.

### TelegramLinkTokenCache
`IMemoryCache`-backed store for short-lived link tokens (10 min TTL).
No DB, no Redis — token only needs to survive the linking session.
Key: `token` (GUID), Value: `userId`.
`ConfirmTelegramLinkCommand` looks up userId by token, saves `telegram_chat_id` to DB, removes token.

### Consumers → Infrastructure
MassTransit consumers are infrastructure (they depend on RabbitMQ transport). Moving them
from `Web/` to `Infrastructure/Broker/Consumers/` corrects the layer violation.
Consumers dispatch MediatR commands/queries for business logic (e.g. GetSettings, SendNotification).

### State Managers → Application
`JobNotificationStateManager` and `NodeNotificationStateManager` are stateful domain services
(in-memory race condition resolvers). They belong in `Application/`, registered as singletons.

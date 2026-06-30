# UI: Notification Settings

## Entry Point

User dropdown in `SidebarFooter` (avatar + ChevronsUpDown) → new menu item "Notifications" →
opens a `<Sheet>` (shadcn, side panel). Sheet does not interrupt context and handles
multi-field settings panels well.

## Sheet Layout

```
Notification Settings
─────────────────────────────────────

Telegram
┌──────────────────────────────────┐
│ 🤖 Not connected                 │
│ [Connect Telegram]               │
└──────────────────────────────────┘
(after linking — on next Sheet open)
┌──────────────────────────────────┐
│ ✅ Connected as @username        │
│ [Disconnect]                     │
└──────────────────────────────────┘

Notify me about
  Errors in graph              <Switch>
  HITL nodes awaiting review   <Switch>
  Job completion               <Switch>
  Successful publication       <Switch>

Delivery
  ○ Always
  ● Only when I'm offline
```

## Data Loading

On Sheet open → single `GET /api/notifications/settings` to ws-gateway.
Returns `{ telegramUsername, notifyOnlyWhenOffline, notifyOnError, notifyOnHitl, notifyOnCompletion, notifyOnPublication }`.
No polling, no SignalR for settings state — the user reads the current snapshot on open.

## Telegram Linking Flow (UI side)

1. User clicks "Connect Telegram"
2. Frontend calls ws-gateway: `POST /api/notifications/telegram/link-token` → `{ token, botUsername }`
3. Frontend opens new tab: `https://t.me/{botUsername}?start={token}`
4. User sends `/start {token}` to bot (Telegram deeplink does this automatically)
5. Bot validates token → ws-gateway saves `telegram_chat_id`
6. User returns to browser, reopens Sheet → sees "Connected as @username"

## Components

- Entry: new `DropdownMenuItem` in `AppSidebar.tsx` → `Bell` icon from lucide-react
- Panel: new `NotificationSettingsSheet.tsx` in `src/features/notifications/components/`
- Hook: `useNotificationSettings` — fetches settings on mount, each Switch/RadioGroup change immediately fires `PATCH /api/notifications/settings` (no Save button)
- shadcn: `Sheet`, `Switch`, `Button`, `RadioGroup`

## Future

If global settings grow (email, push, etc.), migrate from Sheet to `/settings` page.

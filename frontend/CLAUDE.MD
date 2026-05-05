# Frontend — Claude Code Guide

## Stack

- **Next.js 16** (App Router), **React 19**, TypeScript strict
- **Tailwind CSS v4** + `tailwind-merge` + `clsx` via `cn()` from `@/lib/utils`
- **shadcn/ui** (Radix UI primitives) — components in `src/components/ui/`
- **@xyflow/react v12** — canvas / node-graph
- **@hey-api/client-axios** — generated API clients
- **@microsoft/signalr** — real-time WebSocket events
- **react-hook-form** + **zod** — forms and validation
- **framer-motion** — animations
- **lucide-react** — icons (only import what you use)

---

## Project structure

```
src/
  app/                        # Next.js App Router pages
    (auth)/                   # Login, register, etc. (no auth required)
    (protected)/              # Requires auth; layout.tsx does redirect
      projects/[projectId]/
        templates/[templateId]/page.tsx  ← main canvas page
  components/
    ui/                       # shadcn/ui components — use these, don't reinvent
    ProjectHeader.tsx
    SectionLayout.tsx
  features/                   # Domain features (self-contained)
    canvas/                   # ReactFlow canvas + node execution
    media/                    # File upload, AmplifyImage, mediaApi
    ambassadors/              # Ambassador/project management
    auth/                     # Auth forms and types
    autolists/
    integrations/
    templates/
  hooks/                      # Global hooks (useHubConnection, use-toast)
  lib/
    api/
      generated/              # AUTO-GENERATED — never edit manually
        template-service/
        media-ingest/
        publisher/
        userservice/
      template-service.ts     # Re-exports generated + manual additions
      media-ingest.ts
      publisher.ts
      userservice.ts
      TypedSignalR.Client/    # AUTO-GENERATED SignalR types — never edit
    axios.ts                  # Single shared axios instance with auth + refresh
    auth.ts
    utils.ts                  # cn() helper
```

---

## Non-negotiable rules

### Use shadcn/ui — never raw HTML elements

| Raw HTML | Use instead |
|---|---|
| `<button>` | `<Button>` from `@/components/ui/button` |
| `<input>` | `<Input>` from `@/components/ui/input` |
| `<textarea>` | `<Textarea>` from `@/components/ui/textarea` |
| `<dialog>` / `createPortal` | `<Dialog>` from `@/components/ui/dialog` |
| Custom dropdown | `<DropdownMenu>` from `@/components/ui/dropdown-menu` |
| `<select>` | `<Select>` from `@/components/ui/select` |
| `<img>` (media-ingest asset) | `<AmplifyImage>` from `@/features/media/components/AmplifyImage` |
| `<img>` (external URL) | `<Image>` from `next/image` |
| `<video>` | `<AmplifyVideo>` from `@/features/media/components/AmplifyVideo` |
| Custom calendar / date picker | `<Calendar>` + `<Popover>` from shadcn |
| Custom carousel / slider | `<Carousel>` from shadcn |
| Custom segment control / tabs | `<Tabs>` from `@/components/ui/tabs` |

**`<button>` is NEVER acceptable** — this includes every interactive element regardless of
how custom or exotic its appearance is: row selectors, day cells, icon-only nav arrows,
segment toggles, carousel controls. All of these use `<Button>` with an appropriate
`variant` and `className`. Heavy custom styling belongs in `className`, not in raw HTML.

**Installed shadcn components:** `alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `carousel`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`.

If a needed component isn't installed, install it first — **never write a custom
implementation of something shadcn already provides**: `npx shadcn@latest add <name>`.

**`Button` variants:** `default | destructive | outline | secondary | ghost | link`
**`Button` sizes:** `default | sm | lg | icon | icon-sm | icon-lg`

### Images and media

**Rule: raw `<img>` and `<video>` tags are never acceptable.**

| Source | Component | When |
|---|---|---|
| media-ingest UUID | `<AmplifyImage mediaId={uuid} …>` | Internal assets managed by media-ingest |
| External URL (social avatar, CDN) | `<Image src={url} …>` from `next/image` | Avatar URLs from third-party APIs |
| media-ingest UUID | `<AmplifyVideo mediaId={uuid} …>` | Internal video assets |
| Direct resolved URL | `<AmplifyVideo src={url} …>` | Pre-resolved video URLs |

`AmplifyImage` uses `fill` — **always wrap in a `relative` container with explicit size**:

```tsx
<div className="relative w-16 h-16 rounded-md overflow-hidden">
  <AmplifyImage mediaId={uuid} variant="Medium" lightbox sizes="64px" />
</div>
```

Variants: `"Tiny" | "Medium" | "Original"`. Use `"Medium"` for thumbnails, `"Tiny"` for
blur placeholders or micro-previews, `"Original"` for full-res.

`AmplifyVideo` accepts either `mediaId` (resolved automatically) or `src` (direct URL):

```tsx
<AmplifyVideo mediaId={uuid} mode="hover-play" />          // media-ingest asset
<AmplifyVideo src={resolvedUrl} mode="controls" loop muted /> // direct URL
```

### Styling

- `cn()` from `@/lib/utils` for all conditional classes — it wraps `clsx` + `tailwind-merge`
- Tailwind only — no CSS-in-JS, no CSS modules
- Inline `style` only for truly dynamic values that Tailwind can't express (e.g. `style={{ width: px, aspectRatio: "9/16" }}`)
- Dark-first — the app has a dark theme throughout

### Colors — use design tokens, never hardcode

**Always prefer CSS variables / Tailwind tokens over literal color values.**

| Need | Do this | Not this |
|---|---|---|
| UI background / surface | `bg-background`, `bg-card`, `bg-muted` | `bg-[#1a1a1a]`, `style={{ background: "oklch(…)" }}` |
| Text | `text-foreground`, `text-muted-foreground` | `text-[#999]` |
| Border | `border-border` | `border-[#333]` |
| Primary accent | `bg-primary`, `text-primary`, `ring-primary` | `bg-[oklch(…)]` |
| Box shadow using app colors | `var(--background)`, `var(--card)` inside `style` string | `#1a1a1a`, `#2a2a2a` |
| Canvas node/port colors | `bg-canvas-image`, `text-canvas-text`, … | `bg-[#ec4899]`, `text-[#a855f7]` |

**Canvas semantic color tokens** (defined in `globals.css @theme inline`, sourced from `canvas/lib/colors.ts`):

| Token | Tailwind class | Use |
|---|---|---|
| `--color-canvas-text` | `canvas-text` | text / STRING nodes |
| `--color-canvas-image` | `canvas-image` | image / IMAGE ports |
| `--color-canvas-video` | `canvas-video` | video / VIDEO ports |
| `--color-canvas-manual` | `canvas-manual` | manual review nodes |
| `--color-canvas-utility` | `canvas-utility` | utility nodes |

When a raw hex string is unavoidable (SVG `stroke`, `box-shadow` alpha composition),
import from `src/features/canvas/lib/colors.ts` — never repeat the literal elsewhere.

---

## API layer

### Generated clients (hey-api)

API clients are generated from OpenAPI specs via `@hey-api/openapi-ts`. **Never edit anything inside `src/lib/api/generated/`.**
To regenerate clients use: `npm run generate:api`

Import from the wrapper files:
```ts
import { getSomethingV1SomeGet } from "@/lib/api/template-service";
import { postApiMediaPresignedUpload } from "@/lib/api/media-ingest";
```

Generated functions return `{ data, error }` — always check both:
```ts
const { data, error } = await getSomethingV1SomeGet({ path: { id } });
if (error || !data) { /* handle */ }
```

### Adding endpoints not yet in the spec

Add to the relevant wrapper file (e.g. `src/lib/api/template-service.ts`):
```ts
export async function runTemplate(templateId: string): Promise<RunTemplateResponse> {
  const response = await api.post<RunTemplateResponse>(
    `${apiBase}/template/v1/engine/run`,
    { template_id: templateId }
  );
  return response.data;
}
```

### Auth

Tokens live in `localStorage` (`accessToken`, `refreshToken`). The shared axios instance
(`src/lib/axios.ts`) automatically injects `Authorization: Bearer` on every request and
handles 401 → silent token refresh → retry. **Never add auth headers manually.**

### Media upload

```ts
// Handles presigned upload + S3 PUT + completion confirmation
const { mediaId, type } = await mediaApi.uploadFile(file, (pct) => setProgress(pct));
```

---

## Real-time (SignalR)

Hub URL: `/hubs/main` (via `useHubConnection` hook).

**`IClientReceiver` events:**
- `onNodeExecutionStatusChanged(nodeId, status, outputs, error)` — canvas node lifecycle
- `onPublicationStatusChanged(publicationRecordId, status, publicUrl, error)`
- `onVideoEditingStepChanged(videoId, nodeId, step, status, error)`
- `onJobCompleted(jobId)`
- `onAssetReady(id, jobId, projectId, mediaId, mediaType)`

**Registration pattern:**
```tsx
const connection = useHubConnection();

useEffect(() => {
  if (!connection) return;
  const receiver: IClientReceiver = {
    onNodeExecutionStatusChanged: async (nodeId, status, outputs, error) => { ... },
    // all methods must be implemented
  };
  const disposable = getReceiverRegister("IClientReceiver").register(connection, receiver);
  return () => disposable.dispose();
}, [connection, stableDepA, stableDepB]); // keep deps STABLE — see warning below
```

**⚠️ Critical:** the dependency array must contain only stable references. Any function
that closes over `edges` or `nodes` (which change on every status update) will cause the
handler to deregister and re-register on every event, potentially dropping events. Use
`useRef` to break unstable closure chains when needed.

---

## Canvas feature (`src/features/canvas/`)

The most complex feature — a ComfyUI-backed node graph.

```
canvas/
  types.ts                  # All types: CanvasNode, CanvasEdge, PortDef, NodeExecutionStatus, etc.
  hooks/
    useCanvasStore.ts        # Central state: nodes, edges, execution lifecycle, setNodeStatus
    useNodeRegistry.ts       # Fetches node schemas from ComfyUI via proxy
  lib/
    schemaMapper.ts          # Converts ComfyUI JSON schema → CanvasNode
  registry/
    index.ts                 # Node schema registry
    preview-schemas.ts       # Schema names that render as PreviewNode
  components/
    AmplifyNode.tsx          # Main node renderer: status badge, ports, widgets, callbacks
    FlowingEdge.tsx          # Animated edge (flowing / error states)
    ScriptSupervisorDialog.tsx  # HITL: shot prompt review + re-generation
    ShotReviewDialog.tsx        # HITL: video trim review
    NodeLibrarySidebar.tsx
    MediaAssetsPanel.tsx
```

### Node execution status

```
idle → queued → processing → success
                           → error
                           → waiting_for_review  (HITL node paused)
```

`waiting_for_review` shows an orange pulsing badge and a "Review" button in `AmplifyNode`.
`setNodeStatus(nodeId, status, error?)` in `useCanvasStore` updates both reducer state and
ReactFlow node data in one call, and also toggles edge `flowing`/`error` visual states.

### HITL dialogs

`ScriptSupervisorDialog` and `ShotReviewDialog` are fullscreen `<Dialog>` components
rendered from the canvas page when `onNodeExecutionStatusChanged` fires with
`WAITING_FOR_REVIEW`. The `schemaName` field on the node determines which dialog opens.

Both dialogs poll the backend for task completion after submit.

---

## Forms

```tsx
const schema = z.object({ name: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({ resolver: zodResolver(schema) });
```

Use `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`
from shadcn for accessible form layouts.

---

## Toasts

```tsx
const { toast } = useToast(); // from @/hooks/use-toast
toast({ title: "Done", description: "Saved successfully." });
toast({ variant: "destructive", title: "Error", description: err.message });
```

---

## Common mistakes to avoid

1. **Editing generated files** — `src/lib/api/generated/**` and `TypedSignalR.Client/` are auto-generated. Never touch them.
2. **Raw `<img>`** — use `<AmplifyImage>` for media-ingest assets or `<Image>` from `next/image` for external URLs. Never `<img>`.
3. **Raw `<video>`** — use `<AmplifyVideo mediaId={…}>` or `<AmplifyVideo src={…}>`. Never `<video>`.
4. **Raw `<button>`, `<input>`, `<textarea>`** — always use shadcn equivalents, no exceptions. A "heavily styled" element is not an excuse — put custom styles in `className`.
5. **Reinventing shadcn components** — before writing a custom calendar, carousel, combobox, date picker, etc., check if shadcn has it. If it's not installed yet, run `npx shadcn@latest add <name>` first.
6. **`createPortal` for modals** — always `<Dialog>` from shadcn.
7. **Unstable SignalR deps** — don't put `edges`, `nodes`, or freshly-created callbacks in the `useEffect` array that registers SignalR handlers.
8. **`clsx` directly** — use `cn()` from `@/lib/utils` which also runs `tailwind-merge`.
9. **Adding auth headers manually** — the axios interceptor handles this automatically.

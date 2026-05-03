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
| `<img>` | `<AmplifyImage>` from `@/features/media/components/AmplifyImage` |
| `<video>` | `<AmplifyVideo>` from `@/features/media/components/AmplifyVideo` |

**Installed shadcn components:** `alert-dialog`, `avatar`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`.

If a needed component isn't installed: `npx shadcn@latest add <name>`.

**`Button` variants:** `default | destructive | outline | secondary | ghost | link`
**`Button` sizes:** `default | sm | lg | icon | icon-sm | icon-lg`

### Images and media

Always use `<AmplifyImage>` for media-ingest assets — never `<img>`. It handles URL
resolution, blur placeholder, error fallback, and optional lightbox.

`AmplifyImage` uses `fill` — **always wrap in a `relative` container with explicit size**:

```tsx
<div className="relative w-16 h-16 rounded-md overflow-hidden">
  <AmplifyImage mediaId={uuid} variant="Medium" lightbox sizes="64px" />
</div>
```

Variants: `"Tiny" | "Medium" | "Original"`. Use `"Medium"` for thumbnails, `"Tiny"` for
blur placeholders or micro-previews, `"Original"` for full-res.

### Styling

- `cn()` from `@/lib/utils` for all conditional classes — it wraps `clsx` + `tailwind-merge`
- Tailwind only — no CSS-in-JS, no CSS modules
- Inline `style` only for truly dynamic values that Tailwind can't express (e.g. `style={{ width: px, aspectRatio: "9/16" }}`)
- Dark-first — the app has a dark theme throughout

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
2. **Raw `<img>`** — always `<AmplifyImage>` for media-ingest assets; wrap in a `relative` sized container.
3. **Raw `<button>`, `<input>`, `<textarea>`** — always use shadcn equivalents.
4. **`createPortal` for modals** — always `<Dialog>` from shadcn.
5. **Unstable SignalR deps** — don't put `edges`, `nodes`, or freshly-created callbacks in the `useEffect` array that registers SignalR handlers.
6. **`clsx` directly** — use `cn()` from `@/lib/utils` which also runs `tailwind-merge`.
7. **Adding auth headers manually** — the axios interceptor handles this automatically.

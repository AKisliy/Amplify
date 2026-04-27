import { defineConfig } from "@hey-api/openapi-ts";

const plugins = ["@hey-api/typescript", "@hey-api/sdk", "@hey-api/client-axios"] as const;

export default defineConfig([
  // ── Template / AI Engine ──────────────────────────────────────────────────
  {
    input: "../api-specs/template-service.json",
    output: {
      path: "src/lib/api/generated/template-service",
      postProcess: ["prettier"],
    },
    plugins,
  },
  // ── User Service  (auth, ambassadors, projects, project-assets) ───────────
  {
    input: "../api-specs/userservice.json",
    output: {
      path: "src/lib/api/generated/userservice",
      postProcess: ["prettier"],
    },
    plugins,
  },
  // ── Publisher Service  (autolists, connections, publications) ─────────────
  {
    input: "../api-specs/publisher.json",
    output: {
      path: "src/lib/api/generated/publisher",
      postProcess: ["prettier"],
    },
    plugins,
  },
  // ── Media Ingest Service  (presigned upload, media management) ───────────
  {
    input: "../api-specs/media-ingest.json",
    output: {
      path: "src/lib/api/generated/media-ingest",
      postProcess: ["prettier"],
    },
    plugins,
  },
]);
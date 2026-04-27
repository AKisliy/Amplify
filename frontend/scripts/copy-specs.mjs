/**
 * copy-specs.mjs
 *
 * Copies each backend service's OpenAPI spec into the shared ../api-specs/
 * directory so that openapi-ts can consume them from one place.
 *
 * Run automatically via:  npm run generate:api
 * Run standalone via:      npm run copy:specs
 */

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", ".."); // repo root (Amplify/)
const dest = join(root, "api-specs");

// Ensure destination directory exists
if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
}

const specs = [
  {
    src: join(root, "userservice", "src", "Web", "wwwroot", "api", "specification.json"),
    dst: join(dest, "userservice.json"),
    name: "userservice",
  },
  {
    src: join(root, "publisher", "src", "Web", "wwwroot", "api", "specification.json"),
    dst: join(dest, "publisher.json"),
    name: "publisher",
  },
  {
    src: join(root, "media-ingest", "src", "Web", "wwwroot", "api", "specification.json"),
    dst: join(dest, "media-ingest.json"),
    name: "media-ingest",
  },
];

for (const { src, dst, name } of specs) {
  if (!existsSync(src)) {
    console.warn(`⚠️  Spec not found, skipping: ${src}`);
    continue;
  }
  copyFileSync(src, dst);
  console.log(`✅  Copied ${name} spec → ${dst}`);
}

console.log("\n📋  All specs copied. Ready for openapi-ts generation.");

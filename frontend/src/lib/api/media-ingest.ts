/**
 * Media Ingest API wrapper
 *
 * Wires the generated hey-api client for the Media Ingest Service onto the
 * shared axios instance so that auth token injection and the 401-refresh
 * queue continue to work exactly as before.
 *
 * NOTE: The presigned S3 PUT (uploadToS3) remains a raw axios call that
 * bypasses this client — S3 presigned URLs must NOT include our auth headers.
 *
 * Covers: presigned upload URLs, upload-completed confirmation
 */
import api from "@/lib/axios";
import { client } from "./generated/media-ingest/client.gen";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";

client.setConfig({
  axios: api,
  baseURL: `${apiBase}/media`,
});

export * from "./generated/media-ingest";
export { client };

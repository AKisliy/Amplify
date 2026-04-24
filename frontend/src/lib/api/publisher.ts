/**
 * Publisher API wrapper
 *
 * Wires the generated hey-api client for the Publisher Service onto the
 * shared axios instance so that auth token injection and the 401-refresh
 * queue continue to work exactly as before.
 *
 * Covers: autolists, autolistentry, connections, publications
 */
import api from "@/lib/axios";
import { client } from "./generated/publisher/client.gen";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";

client.setConfig({
  axios: api,
  baseURL: `${apiBase}/publisher`,
});

export * from "./generated/publisher";
export { client };

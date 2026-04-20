/**
 * Userservice API wrapper
 *
 * Wires the generated hey-api client for the UserService onto the shared
 * axios instance so that auth token injection and the 401-refresh queue
 * continue to work exactly as before.
 *
 * Covers: auth, ambassadors, projects, project-assets
 */
import api from "@/lib/axios";
import { client } from "./generated/userservice/client.gen";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";

client.setConfig({
  axios: api,
  baseURL: `${apiBase}/userservice`,
});

export * from "./generated/userservice";
export { client };

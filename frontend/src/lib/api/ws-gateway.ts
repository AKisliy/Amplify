import api from "@/lib/axios";
import { client } from "./generated/websocket-gateway/client.gen";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";

client.setConfig({
  axios: api,
  baseURL: `${apiBase}/ws-gateway`,
});

export * from "./generated/websocket-gateway";
export { client };

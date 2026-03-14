import api from "@/lib/axios";
import { client } from "./generated/template-service/client.gen";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";

client.setConfig({
  axios: api,
  baseURL: `${apiBase}/template`,
});

export * from "./generated/template-service";
export { client };
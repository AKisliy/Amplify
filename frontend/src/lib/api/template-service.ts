import api from "@/lib/axios";
import { client } from "./generated/template-service/client.gen";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";

client.setConfig({
  axios: api,
  baseURL: `${apiBase}/template`,
});

export * from "./generated/template-service";
export { client };

// ── POST /v1/engine/run (not yet in generated spec) ───────────────────────────

export interface RunTemplateResponse {
  job_id: string;
  prompt_id: string;
}

export async function runTemplate(templateId: string): Promise<RunTemplateResponse> {
  const response = await api.post<RunTemplateResponse>(
    `${apiBase}/template/v1/engine/run`,
    { template_id: templateId }
  );
  return response.data;
}
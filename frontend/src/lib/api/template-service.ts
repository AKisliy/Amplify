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

// ── Manual review ──────────────────────────────────────────────────────────────

export interface ManualReviewTask {
  id: string;
  jobId: string;
  nodeId: string;
  nodeType: string;
  status: string;
  autoConfirm: boolean;
  payload: Record<string, unknown>;
  decision: Record<string, unknown> | null;
}

export async function getManualReviewByJobAndNode(
  jobId: string,
  nodeId: string
): Promise<ManualReviewTask | null> {
  const response = await api.get<ManualReviewTask | null>(
    `${apiBase}/template/v1/review/job/${jobId}/node/${nodeId}`
  );
  return response.data ?? null;
}

export async function completeManualReview(
  taskId: string,
  decision: Record<string, unknown>
): Promise<ManualReviewTask> {
  const response = await api.post<ManualReviewTask>(
    `${apiBase}/template/v1/review/${taskId}/complete`,
    { decision }
  );
  return response.data;
}
// =============================================================================
// ComfyUI API Service
// Wraps the ComfyUI Cloud API (https://cloud.comfy.org) endpoints.
// Grouped into three namespaces: workflow, job, node.
//
// Env vars:
//   NEXT_PUBLIC_COMFY_API_URL  — defaults to https://cloud.comfy.org
//   NEXT_PUBLIC_COMFY_API_KEY  — X-Api-Key header for cloud auth
// =============================================================================

import axios from "axios";
import type {
  PromptRequest,
  PromptResponse,
  QueueStatusResponse,
  HistoryResponse,
  DeleteHistoryRequest,
  ObjectInfoResponse,
} from "../types";

// ---------------------------------------------------------------------------
// Dedicated axios instance — completely separate from the Amplify app API
// ---------------------------------------------------------------------------

const COMFY_BASE_URL = "/api/comfy";

const comfyClient = axios.create({
  baseURL: COMFY_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Note: API Key and Auth are now handled by the server-side proxy at /api/comfy/[...path]
// to resolve CORS and protect sensitive keys.

// ---------------------------------------------------------------------------
// Workflow endpoints — queue management and prompt submission
// ---------------------------------------------------------------------------

export const workflowApi = {
  /**
   * GET /api/prompt
   * Returns information about the current prompt execution queue.
   * Response: { exec_info: { queue_remaining: number } }
   */
  getQueueStatus: async (): Promise<QueueStatusResponse> => {
    const { data } = await comfyClient.get<QueueStatusResponse>("prompt");
    return data;
  },

  /**
   * POST /api/prompt
   * Queues a new workflow for execution.
   * Returns the assigned prompt_id and any node_errors.
   */
  submitWorkflow: async (request: PromptRequest): Promise<PromptResponse> => {
    const { data } = await comfyClient.post<PromptResponse>(
      "prompt",
      request
    );
    return data;
  },
} as const;

// ---------------------------------------------------------------------------
// Job endpoints — execution history and result retrieval
// ---------------------------------------------------------------------------

export const jobApi = {
  /**
   * GET /api/history
   * Returns the full execution history (all completed jobs).
   */
  getHistory: async (): Promise<HistoryResponse> => {
    const { data } = await comfyClient.get<HistoryResponse>("history");
    return data;
  },

  /**
   * GET /api/history/{promptId}
   * Returns the result of a specific job by its prompt_id.
   */
  getJobResult: async (promptId: string): Promise<HistoryResponse> => {
    const { data } = await comfyClient.get<HistoryResponse>(
      `history/${promptId}`
    );
    return data;
  },

  /**
   * DELETE /api/history
   * Deletes specific history entries or clears all history.
   *
   * Examples:
   *   jobApi.deleteHistory({ delete: ["prompt-id-1", "prompt-id-2"] })
   *   jobApi.deleteHistory({ clear: true })
   */
  deleteHistory: async (request: DeleteHistoryRequest): Promise<void> => {
    await comfyClient.delete("history", { data: request });
  },
} as const;

// ---------------------------------------------------------------------------
// Node endpoints — runtime node definition discovery
// ---------------------------------------------------------------------------

export const nodeApi = {
  /**
   * GET /api/object_info
   * Returns the full registry of all available node definitions.
   * Useful for validating our local schemas against the live server.
   */
  getObjectInfo: async (): Promise<ObjectInfoResponse> => {
    const { data } = await comfyClient.get<ObjectInfoResponse>(
      "object_info"
    );
    return data;
  },

  /**
   * GET /api/object_info/{nodeType}
   * Returns the definition for a single node type.
   * e.g. nodeApi.getNodeInfo("GeminiNodeAmplify")
   */
  getNodeInfo: async (nodeType: string): Promise<ObjectInfoResponse> => {
    const { data } = await comfyClient.get<ObjectInfoResponse>(
      `object_info/${nodeType}`
    );
    return data;
  },
} as const;

// ---------------------------------------------------------------------------
// Re-export the underlying client for advanced use (e.g. custom requests)
// ---------------------------------------------------------------------------

export { comfyClient };

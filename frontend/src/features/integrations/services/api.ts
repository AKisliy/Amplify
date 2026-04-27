import {
  getApiConnectionsAuthUrl,
  connection as connectSdk,
  getApiConnections,
  deleteApiConnectionsAccounts,
  type SocialProvider,
} from "@/lib/api/publisher";
import { IntegrationsResponse } from "../types";

export const integrationsApi = {
  async getAuthUrl(projectId: string, provider: string): Promise<string> {
    const { data } = await getApiConnectionsAuthUrl({
      path: { projectId },
      query: { provider: provider as SocialProvider },
    });
    return (data as any)?.authUrl ?? "";
  },

  async connect(code: string, state: string): Promise<void> {
    const cleanState = state.replace(/#_$/, "");
    await connectSdk({ body: { code, state: cleanState } });
  },

  async getIntegrations(projectId: string): Promise<IntegrationsResponse> {
    const { data } = await getApiConnections({ path: { projectId } });
    return data as unknown as IntegrationsResponse;
  },

  async disconnectAccount(projectId: string, accountId: string): Promise<void> {
    await deleteApiConnectionsAccounts({ path: { projectId, accountId } });
  },
};

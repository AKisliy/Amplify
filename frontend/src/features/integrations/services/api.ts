import api from "@/lib/axios";
import type { InstagramAuthUrl, ProjectIntegrations } from "../types";

// Publisher service runs on port 5051
const PUBLISHER_API_BASE = process.env.NEXT_PUBLIC_PUBLISHER_API_BASE_URL || "http://localhost:5051/api";

export const instagramApi = {
  /**
   * Get Instagram OAuth authorization URL
   */
  async getAuthUrl(projectId: string): Promise<InstagramAuthUrl> {
    const response = await fetch(`${PUBLISHER_API_BASE}/integrations/${projectId}/instagram/auth-url`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Instagram auth URL');
    }
    
    return response.json();
  },

  /**
   * Connect Instagram account using OAuth code
   */
  async connectAccount(projectId: string, code: string): Promise<void> {
    const response = await fetch(
      `${PUBLISHER_API_BASE}/integrations/${projectId}/instagram/connect?code=${encodeURIComponent(code)}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to connect Instagram account');
    }
  },

  /**
   * Get all integrations for a project
   */
  async getProjectIntegrations(projectId: string): Promise<ProjectIntegrations> {
    const response = await fetch(`${PUBLISHER_API_BASE}/integrations/${projectId}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to get project integrations');
    }
    
    return response.json();
  },
};

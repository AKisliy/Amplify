"use client";

import { useState } from "react";
import { instagramApi } from "../services/api";
import type { ProjectIntegrations } from "../types";

export function useInstagramIntegration(projectId: string) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [integrations, setIntegrations] = useState<ProjectIntegrations | null>(null);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  /**
   * Initiate Instagram OAuth flow
   */
  const connectInstagram = async () => {
    try {
      setIsConnecting(true);
      const { url } = await instagramApi.getAuthUrl(projectId);
      
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'Instagram OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        // Validate origin for security
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'INSTAGRAM_OAUTH_SUCCESS') {
          const { code } = event.data;
          
          try {
            await instagramApi.connectAccount(projectId, code);
            await fetchIntegrations(); // Refresh integrations
            popup?.close();
          } catch (error) {
            console.error('Failed to connect Instagram:', error);
            throw error;
          }
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Cleanup listener when popup closes
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 500);

    } catch (error) {
      console.error('Error initiating Instagram connection:', error);
      setIsConnecting(false);
      throw error;
    }
  };

  /**
   * Fetch project integrations
   */
  const fetchIntegrations = async () => {
    try {
      setIsLoadingIntegrations(true);
      const data = await instagramApi.getProjectIntegrations(projectId);
      setIntegrations(data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  /**
   * Check if Instagram is connected
   */
  const isInstagramConnected = () => {
    return integrations?.socialAccounts?.some(
      (account) => account.provider === 'Instagram'
    ) ?? false;
  };

  /**
   * Get connected Instagram account
   */
  const getInstagramAccount = () => {
    return integrations?.socialAccounts?.find(
      (account) => account.provider === 'Instagram'
    );
  };

  return {
    connectInstagram,
    fetchIntegrations,
    isConnecting,
    integrations,
    isLoadingIntegrations,
    isInstagramConnected: isInstagramConnected(),
    instagramAccount: getInstagramAccount(),
  };
}

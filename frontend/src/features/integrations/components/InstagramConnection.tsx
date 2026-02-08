"use client";

import { useState, useEffect } from "react";
import { Instagram, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInstagramIntegration } from "../hooks/useInstagramIntegration";
import { motion } from "framer-motion";

interface InstagramConnectionProps {
  projectId: string;
}

export function InstagramConnection({ projectId }: InstagramConnectionProps) {
  const {
    connectInstagram,
    fetchIntegrations,
    isConnecting,
    isLoadingIntegrations,
    isInstagramConnected,
    instagramAccount,
  } = useInstagramIntegration(projectId);

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  useEffect(() => {
    if (isInstagramConnected && !showSuccess) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [isInstagramConnected]);

  const handleConnect = async () => {
    try {
      await connectInstagram();
    } catch (error) {
      console.error("Failed to connect Instagram:", error);
    }
  };

  if (isLoadingIntegrations) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-3 shadow-lg">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">Instagram</h3>
                {isInstagramConnected && (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {isInstagramConnected
                  ? `Connected as @${instagramAccount?.username}`
                  : "Connect your Instagram Business account to publish content"}
              </p>
              
              {isInstagramConnected && instagramAccount && (
                <div className="text-xs text-muted-foreground">
                  Token expires: {new Date(instagramAccount.tokenExpiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div>
            {!isInstagramConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white border-0"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                variant="outline"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  "Reconnect"
                )}
              </Button>
            )}
          </div>
        </div>

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Instagram account connected successfully!
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

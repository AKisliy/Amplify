"use client";

import { useEffect, useState } from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

function getHubUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_WS_GATEWAY_URL ??
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech"}`;
  return `${base}/hubs/main`;
}

function isTokenExpiredOrExpiring(token: string, thresholdMs = 30_000): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() >= payload.exp * 1000 - thresholdMs;
  } catch {
    return false;
  }
}

async function getValidAccessToken(): Promise<string> {
  const token = localStorage.getItem("accessToken") ?? "";
  if (!token || !isTokenExpiredOrExpiring(token)) return token;

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return token;

  try {
    const envUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech";
    // TODO: refactor to use typed client
    const res = await fetch(`${envUrl}/userservice/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token, refreshToken }),
    });
    if (!res.ok) return token;

    const data = await res.json();
    const newAccess = data.accessToken ?? data.AccessToken;
    const newRefresh = data.refreshToken ?? data.RefreshToken;
    if (!newAccess) return token;

    localStorage.setItem("accessToken", newAccess);
    if (newRefresh) localStorage.setItem("refreshToken", newRefresh);
    return newAccess;
  } catch {
    return token;
  }
}

/**
 * Creates and manages a SignalR connection to the WebSocket Gateway.
 * The connection is established on mount and torn down on unmount.
 * accessTokenFactory refreshes the JWT when it is expired or about to expire,
 * preventing infinite 401 reconnect loops.
 */
export function useHubConnection() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const conn = new HubConnectionBuilder()
      .withUrl(getHubUrl(), {
        accessTokenFactory: () => getValidAccessToken(),
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    conn.onclose(() => setIsConnected(false));
    conn.onreconnecting(() => setIsConnected(false));
    conn.onreconnected(() => setIsConnected(true));

    conn
      .start()
      .then(() => {
        setConnection(conn);
        setIsConnected(true);
      })
      .catch((err) => {
        console.error("[useHubConnection] Failed to connect:", err);
      });

    return () => {
      conn.stop();
    };
  }, []);

  return { connection, isConnected };
}

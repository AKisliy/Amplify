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
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://staging.alexeykiselev.tech"}/ws`;
  return `${base}/hubs/main`;
}

/**
 * Creates and manages a SignalR connection to the WebSocket Gateway.
 * The connection is established on mount and torn down on unmount.
 * JWT is read from localStorage on each reconnect attempt.
 */
export function useHubConnection() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const conn = new HubConnectionBuilder()
      .withUrl(getHubUrl(), {
        accessTokenFactory: () =>
          localStorage.getItem("accessToken") ?? "",
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

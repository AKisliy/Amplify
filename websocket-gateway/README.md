# WebSocket Gateway

This document provides instructions for frontend developers on how to connect to and interact with the WebSocket Gateway service.

## Overview

The WebSocket Gateway provides real-time updates to client applications. It listens for specific events from a backend message broker (RabbitMQ) and pushes them directly to connected clients using SignalR, a library for real-time web functionality.

This allows your frontend application to react instantly to events happening on the server-side without needing to poll for updates.

## How it Works

The data flow is straightforward:

1.  A backend service publishes an event (e.g., a publication's status changes).
2.  The event is sent to a RabbitMQ message queue.
3.  The WebSocket Gateway, which is subscribed to this queue, receives the event.
4.  The gateway processes the event and broadcasts it to all connected WebSocket clients.
5.  Your client application receives the event and can update its UI accordingly.

## Connecting to the Gateway

To receive real-time updates, your application needs to establish a WebSocket connection to the SignalR hub.

**Hub URL:** `http://<your-gateway-host>/hubs/main`

You will use a SignalR client library for your specific platform (e.g., `@microsoft/signalr` for JavaScript/TypeScript) to connect to this URL.

## Listening for Events

Once connected, you can register handlers to listen for specific events broadcast by the gateway. The server invokes methods on the client, so you define the methods the server can call.

### Example: Publication Status Changes

A primary event pushed by the gateway is the `OnPublicationStatusChanged` event. This is triggered whenever a publication's status is updated in the backend.

**Event Method Signature:**

```typescript
OnPublicationStatusChanged(
    publicationRecordId: string, // GUID as a string
    status: string,
    publicUrl: string | null,
    error: string | null
);
```

**Parameters:**

-   `publicationRecordId`: The unique identifier for the publication that was updated.
-   `status`: The new status of the publication (e.g., "Processing", "Published", "Failed").
-   `publicUrl`: The public URL of the publication if the status is "Published". Otherwise, this is `null`.
-   `error`: An error message if the status is "Failed". Otherwise, this is `null`.

## Available Events

The following events are broadcast by the gateway.

| Method Name                  | Description                                            | Parameters                                                              |
| ---------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `OnPublicationStatusChanged` | Fired when the status of a publication record changes. | `publicationRecordId`, `status`, `publicUrl`, `error`                   |

## Example Client Implementation (TypeScript)

Here is a basic example of how to connect to the gateway and listen for the `OnPublicationStatusChanged` event using the `@microsoft/signalr` library.

**1. Install the SignalR client library:**

```bash
npm install @microsoft/signalr
```

**2. Create a connection and register a handler:**

```typescript
import { HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
// Generated client-interfaces
import { IClientReceiver } from "./TypedSignalR.Client/WebSocketGateway.Web.Receivers";
import { getReceiverRegister } from "./TypedSignalR.Client";

async function run() {
    console.log("🚀 Starting SignalR client...");

    const connection = new HubConnectionBuilder()
        .withUrl(API_URL, {
            accessTokenFactory: () => TEST_JWT_TOKEN,
            transport: HttpTransportType.WebSockets,
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

    const handlers: IClientReceiver = {
        onPublicationStatusChanged: async (recordId, status, publicUrl, error) => {
            console.log("\n⚡ [EVENT RECEIVED] onPublicationStatusChanged");
            console.table({
                RecordId: recordId,
                Status: status,
                URL: publicUrl || "N/A",
                Error: error || "None"
            });
        }
    };

    const binder = getReceiverRegister("IClientReceiver");
    binder.register(connection, handlers);

    try {
        await connection.start();
        console.log("✅ Connection established. Connection ID:", connection.connectionId);
        console.log("⏳ Waiting for events... (Ctrl+C to exit)");
    } catch (err) {
        console.error("❌ Connection failed:", err);
    }
}

run();

setInterval(() => { }, 100000);

```

## Local Development

To run the gateway service on your local machine for development:

1.  Clone the repository.
2.  Ensure you have the .NET SDK installed.
3.  Run the application:
    ```bash
    dotnet run --project src/Web/Web.csproj
    ```
The service will start, and you can connect your frontend client to the local URL (e.g., `http://localhost:5000/hubs/main`).

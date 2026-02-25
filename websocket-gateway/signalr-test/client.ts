import { HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
import { IClientReceiver } from "./TypedSignalR.Client/WebSocketGateway.Web.Receivers";
import { getReceiverRegister } from "./TypedSignalR.Client";

const API_URL = "http://localhost:5105/hubs/main";
const TEST_JWT_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImF1dGgta2V5LTEiLCJ0eXAiOiJKV1QifQ.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjAzODUyYjI4LTJjZmItNDkwYS04YmE3LWRmN2I2Yjg4ODkyMCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6ImFkbWluaXN0cmF0b3JAbG9jYWxob3N0IiwianRpIjoiNTg1NWY5MzgtODg2My00OGQ0LWJhNTAtY2Y5ZWZkYjljYWYwIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiQWRtaW5pc3RyYXRvciIsImV4cCI6MTc3MjAzMTYxOSwiaXNzIjoiaHR0cDovL3VzZXJzZXJ2aWNlLnRlc3QtZW52LnN2Yy5jbHVzdGVyLmxvY2FsL3VzZXJzZXJ2aWNlL2FwaS9hdXRoIiwiYXVkIjoiTXlBcHBEZXZlbG9wbWVudFVzZXJzIn0.DTcEaIncXhYoihNA-sABp4wCiAhKmdTNJBPo7vzk-u8UXIsk7jNACKb96BC4kbmh6rqY34SGEZrcj0ezUhXcEryllKWe5mR-5EF1GcnK2iAvSxtO6YMj7FhfD65aWBS_DORTQlWIRXan9b83u7cbkqhYvjezIUlu4fWdbNTf84QFYtN5b0Aw5vePgxL5pWqH0V4Hwrt8qV9_n4zUGMNc3QQVWyi3RvtET-8Mq814SnjvncSOIMCgwh24QZwYY_ShG4LsFZ0O2UbsKThRQ-LnFoQxTcE427Gdc8ufcM2zdsmxhmMIrI6SgfdRFMez6kwjrVWD8IkcjCPGNlR0QkbpKQ"

async function run() {
    console.log("🚀 Запуск SignalR клиента...");

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
        console.log("✅ Соединение установлено! Connection ID:", connection.connectionId);
        console.log("⏳ Ожидание событий... (Нажми Ctrl+C для выхода)");
    } catch (err) {
        console.error("❌ Ошибка подключения:", err);
    }
}

run();

setInterval(() => { }, 100000);
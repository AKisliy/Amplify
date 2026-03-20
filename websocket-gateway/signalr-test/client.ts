import { HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
import { IClientReceiver } from "./TypedSignalR.Client/WebSocketGateway.Web.Receivers";
import { getReceiverRegister } from "./TypedSignalR.Client";

const API_URL = "http://localhost:5105/hubs/main";
const TEST_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6ImY1MTdhNjdjLTAyYjEtNDcxMC05YjM1LTA0OTJiMDI5ZDBjNCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6ImZyb250ZW5kQGRldi5sb2NhbCIsInJvbGUiOiJBZG1pbiIsImV4cCI6NDkyNTcyNzQ4MSwiaXNzIjoiZGV2LWxvY2FsIiwiYXVkIjoicHVibGlzaGVyLWFwaSJ9.UrSq4n_bP-UYX5bZdR81RvhncRm4uOod4ljEqkjGDW0"

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
        },
        onVideoEditingStepChanged: async (videoId, nodeId, step, status) => {
            console.log("\n⚡ [EVENT RECEIVED] onVideoEditingStepChanged");
            console.table({
                VideoId: videoId,
                NodeId: nodeId,
                Step: step,
                Status: status
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
using TypedSignalR.Client;

namespace WebSocketGateway.Web.Receivers;

[Receiver]
public interface IClientReceiver
{
    Task OnPublicationStatusChanged(Guid publicationRecordId, string status, string? publicUrl, string? error);

    Task OnVideoEditingStepChanged(string videoId, string nodeId, string step, string status, string? error);

    Task OnNodeExecutionStatusChanged(string nodeId, string status, object? outputs, string? error);

    // Sent when the graph finishes executing; frontend shows a loading indicator
    Task OnJobCompleted(string jobId);

    // Sent when userservice confirms the asset is saved; frontend shows the final "ready" toast with a link
    Task OnAssetReady(string id, string jobId, string projectId, string mediaId, string mediaType);
}

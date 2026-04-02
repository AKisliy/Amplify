using TypedSignalR.Client;

namespace WebSocketGateway.Web.Receivers;

[Receiver]
public interface IClientReceiver
{
    Task OnPublicationStatusChanged(Guid publicationRecordId, string status, string? publicUrl, string? error);

    Task OnVideoEditingStepChanged(string videoId, string nodeId, string step, string status, string? error);

    Task OnNodeExecutionStatusChanged(string nodeId, string status, object? outputs, string? error);

    Task OnGraphCompleted(string jobId, string templateId, string? mediaId, string? mediaType);
}

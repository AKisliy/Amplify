using TypedSignalR.Client;

namespace WebSocketGateway.Web.Receivers;

[Receiver]
public interface IClientReceiver
{
    Task OnPublicationStatusChanged(Guid publicationRecordId, string status, string? publicUrl, string? error);

    Task OnVideoEditingStepChanged(string videoId, string nodeId, string step, string status, string? error);
}

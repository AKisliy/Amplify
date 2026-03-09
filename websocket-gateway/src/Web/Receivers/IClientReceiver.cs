using TypedSignalR.Client;

namespace WebSocketGateway.Web.Receivers;

[Receiver]
public interface IClientReceiver
{
    Task OnPublicationStatusChanged(Guid publicationRecordId, string status, string? publicUrl, string? error);
}

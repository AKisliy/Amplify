using TypedSignalR.Client;

namespace Publisher.Infrastructure.Receivers;

[Receiver]
public interface IPublisherReceiver
{
    Task OnPublicationStatusChanged(Guid publicationRecordId, string status, string? publicUrl, string? error);
}

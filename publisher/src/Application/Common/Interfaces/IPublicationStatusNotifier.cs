using Publisher.Domain.Entities;

namespace Publisher.Application.Common.Interfaces;

public interface IPublicationStatusNotifier
{
    Task NotifyPublicationStatusChangedAsync(PublicationRecord publicationRecord);
}

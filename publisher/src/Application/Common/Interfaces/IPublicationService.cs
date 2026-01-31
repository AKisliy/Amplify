namespace Publisher.Application.Common.Interfaces;

public interface IPublicationService
{
    Task PublishPostAsync(Guid publicationRecordId, CancellationToken cancellationToken = default);
}

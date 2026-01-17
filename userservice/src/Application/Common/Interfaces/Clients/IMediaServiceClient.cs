namespace UserService.Application.Common.Interfaces.Clients;

public interface IMediaServiceClient
{
    Task DeleteMediaAsync(Guid mediaId);
}

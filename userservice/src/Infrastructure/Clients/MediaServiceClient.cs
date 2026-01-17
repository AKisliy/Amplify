using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Interfaces.Clients;
using UserService.Infrastructure.Options;

namespace UserService.Infrastructure.Clients;

public class MediaServiceClient(
    ILogger<MediaServiceClient> logger,
    IOptions<InternalUrlsOptions> internalUrlsOptions) : IMediaServiceClient
{
    public Task DeleteMediaAsync(Guid mediaId)
    {
        logger.LogInformation(
            "Deleting media with ID {MediaId} from internal media service URL. ({InternalMediaServiceBaseUrl})",
            mediaId,
            internalUrlsOptions.Value.MediaServiceInternalBaseUrl);
        // Implementation for deleting media from the internal media service
        return Task.CompletedTask;
    }
}

using Flurl;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Interfaces.Clients;
using UserService.Infrastructure.Options;

namespace UserService.Infrastructure.Clients;

public class MediaServiceClient(
    ILogger<MediaServiceClient> logger,
    HttpClient httpClient,
    IOptions<InternalUrlsOptions> internalUrlsOptions) : IMediaServiceClient
{
    public async Task DeleteMediaAsync(Guid mediaId)
    {
        logger.LogInformation(
            "Deleting media with ID {MediaId} from internal media service URL. ({InternalMediaServiceBaseUrl})",
            mediaId,
            internalUrlsOptions.Value.MediaServiceInternalBaseUrl);

        var url = Url.Combine("api", "media", mediaId.ToString());

        var response = await httpClient.DeleteAsync(url);

        if (response.IsSuccessStatusCode)
        {
            logger.LogInformation("Successfully deleted media with ID {MediaId}.", mediaId);
        }
        else
        {
            logger.LogWarning(
                "Failed to delete media with ID {MediaId}. Status Code: {StatusCode}",
                mediaId,
                response.StatusCode);
        }
    }
}

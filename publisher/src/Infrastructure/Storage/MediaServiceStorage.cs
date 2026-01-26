using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Infrastructure.Storage;

public class MediaServiceStorage(
    HttpClient httpClient,
    ILogger<MediaServiceStorage> logger) : IFileStorage
{
    private readonly ILogger _logger = logger;

    public async Task<string> GetPresignedUrlAsync(Guid fileId)
    {
        // TODO: заменить на реальный вызов медиа-сервиса
        _logger.LogInformation("Getting presigned URL for file ID: {FileId}", fileId);
        var response = await httpClient.GetAsync($"/media/internal/{fileId}");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }
}

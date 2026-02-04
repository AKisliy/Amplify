using Publisher.Application.Common.Models.Instagram;

namespace Publisher.Application.Common.Interfaces;

public interface IInstagramIntegrationService
{
    Task<bool> ConnectInstagramAccountAsync(
        string code,
        Guid projectId,
        CancellationToken cancellationToken = default);

    Task<InstagramAuthUrl> GetAuthUrlAsync(CancellationToken cancellationToken = default);
}


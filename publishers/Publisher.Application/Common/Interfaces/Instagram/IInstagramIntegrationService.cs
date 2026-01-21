using Publisher.Application.Integrations.Queries;

namespace Publisher.Application.Common.Interfaces.Instagram;

public interface IInstagramIntegrationService
{
    Task<bool> ConnectInstagramAccountAsync(string code);

    Task<InstargramAuthUrl> GetAuthUrlAsync();
}

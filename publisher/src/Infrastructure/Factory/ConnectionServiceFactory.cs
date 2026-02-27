using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Domain.Enums;

namespace Publisher.Infrastructure.Factory;

public class ConnectionServiceFactory(
    IEnumerable<IConnectionService> services,
    ILogger<ConnectionServiceFactory> logger) : IConnectionServiceFactory
{
    public IConnectionService GetConnectionService(SocialProvider provider)
    {
        var service = services.FirstOrDefault(x => x.SocialProvider == provider);

        if (service == null)
        {
            logger.LogWarning("No integration service implemented for provider {Provider}", provider);
            throw new NotImplementedException($"No integration service implemented for provider {provider}");
        }

        return service;
    }
}

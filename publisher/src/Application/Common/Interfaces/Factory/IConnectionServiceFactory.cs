using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Interfaces.Factory;

public interface IConnectionServiceFactory
{
    IConnectionService GetConnectionService(SocialProvider provider);
}

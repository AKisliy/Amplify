using Publisher.Application.Common.Interfaces.Instagram;

namespace Publisher.Application.Integrations.Commands.ConnectInstagramAccount;

public record ConnectInstagramAccountCommand(string Code) : IRequest<bool>;

public class ConnectInstagramAccountCommandHandler(IInstagramIntegrationService instagramIntegrationService)
    : IRequestHandler<ConnectInstagramAccountCommand, bool>
{
    public async Task<bool> Handle(ConnectInstagramAccountCommand request, CancellationToken cancellationToken)
    {
        return await instagramIntegrationService.ConnectInstagramAccountAsync(request.Code);
    }
}

using Publisher.Application.Common.Interfaces.Instagram;

namespace Publisher.Application.Integrations.Queries;

public record GetInstagramAuthUrlQuery : IRequest<InstargramAuthUrl>;

public class GetInstagramAuthUrlHandler(IInstagramIntegrationService instagramIntegrationService)
    : IRequestHandler<GetInstagramAuthUrlQuery, InstargramAuthUrl>
{
    public async Task<InstargramAuthUrl> Handle(GetInstagramAuthUrlQuery request, CancellationToken cancellationToken)
    {
        return await instagramIntegrationService.GetAuthUrlAsync();
    }
}

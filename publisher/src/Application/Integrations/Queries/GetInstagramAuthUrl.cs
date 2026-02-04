using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Instagram;

namespace Publisher.Application.Integrations.Queries;

public record GetInstagramAuthUrlQuery : IRequest<InstagramAuthUrl>;

public class GetInstagramAuthUrlHandler(IInstagramIntegrationService instagramIntegrationService)
    : IRequestHandler<GetInstagramAuthUrlQuery, InstagramAuthUrl>
{
    public async Task<InstagramAuthUrl> Handle(GetInstagramAuthUrlQuery request, CancellationToken cancellationToken)
    {
        return await instagramIntegrationService.GetAuthUrlAsync(cancellationToken);
    }
}

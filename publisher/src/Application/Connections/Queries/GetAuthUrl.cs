using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Enums;

namespace Publisher.Application.Connections.Queries;

public record GetAuthUrlQuery(Guid ProjectId, SocialProvider Provider) : IRequest<AuthUrlResponse>;

public class GetAuthUrlHandler(IConnectionServiceFactory connectionServiceFactory)
    : IRequestHandler<GetAuthUrlQuery, AuthUrlResponse>
{
    public async Task<AuthUrlResponse> Handle(GetAuthUrlQuery request, CancellationToken cancellationToken)
    {
        var connectionService = connectionServiceFactory.GetConnectionService(request.Provider);

        return await connectionService.GetAuthUrlAsync(request.ProjectId, cancellationToken);
    }
}

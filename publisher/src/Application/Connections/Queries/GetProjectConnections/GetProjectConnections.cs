using Publisher.Application.AutoLists.Queries.GetAutoList;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.Connections.Queries.GetProjectConnections;

public record GetProjectIntegrationsQuery(Guid ProjectId) : IRequest<ConnectionsVm>;

public class GetProjectIntegrationsQueryHandler(IApplicationDbContext context, IMapper mapper)
    : IRequestHandler<GetProjectIntegrationsQuery, ConnectionsVm>
{
    public async Task<ConnectionsVm> Handle(GetProjectIntegrationsQuery request, CancellationToken cancellationToken)
    {
        var integrations = await context.SocialAccounts
            .Where(x => x.ProjectId == request.ProjectId)
            .ProjectTo<FullSocialAccountDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new ConnectionsVm { Connections = integrations.AsReadOnly() };
    }
}
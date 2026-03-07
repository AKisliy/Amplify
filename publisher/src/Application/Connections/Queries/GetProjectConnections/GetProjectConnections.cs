using Publisher.Application.AutoLists.Queries.GetAutoList;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.Connections.Queries.GetProjectConnections;

public record GetProjectIntegrationsQuery(Guid ProjectId) : IRequest<ConnectionsVm>;

public class GetProjectIntegrationsQueryHandler(IApplicationDbContext context, IMapper mapper)
    : IRequestHandler<GetProjectIntegrationsQuery, ConnectionsVm>
{
    public async Task<ConnectionsVm> Handle(GetProjectIntegrationsQuery request, CancellationToken cancellationToken)
    {
        var connections = await context.Projects
            .Where(p => p.Id == request.ProjectId)
            .SelectMany(p => p.SocialAccounts)
            .ProjectTo<FullSocialAccountDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new ConnectionsVm { Connections = connections.AsReadOnly() };
    }
}
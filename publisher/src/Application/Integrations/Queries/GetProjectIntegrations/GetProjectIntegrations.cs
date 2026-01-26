using Publisher.Application.AutoLists.Queries.GetAutoList;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.Integrations.Queries.GetProjectIntegrations;

public record GetProjectIntegrationsQuery(Guid ProjectId) : IRequest<IntegrationsVm>;

public class GetProjectIntegrationsQueryHandler(IApplicationDbContext context, IMapper mapper)
    : IRequestHandler<GetProjectIntegrationsQuery, IntegrationsVm>
{
    public async Task<IntegrationsVm> Handle(GetProjectIntegrationsQuery request, CancellationToken cancellationToken)
    {
        var integrations = await context.SocialAccounts
            .Where(x => x.ProjectId == request.ProjectId)
            .ProjectTo<FullSocialAccountDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new IntegrationsVm { Integrations = integrations.AsReadOnly() };
    }
}
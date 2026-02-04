using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.AutoLists.Queries.GetAutoLists;

public record GetAutoListsQuery(Guid ProjectId) : IRequest<AutoListsVm>;

public class GetAutoListsQueryHandler(
    IApplicationDbContext dbContext,
    IMapper mapper) : IRequestHandler<GetAutoListsQuery, AutoListsVm>
{
    public async Task<AutoListsVm> Handle(GetAutoListsQuery request, CancellationToken cancellationToken)
    {
        var autoLists = await dbContext.AutoLists
            .AsNoTracking()
            .Where(l => l.ProjectId == request.ProjectId)
            .ProjectTo<AutoListDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new AutoListsVm { AutoLists = autoLists };
    }
}

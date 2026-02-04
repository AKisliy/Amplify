using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.AutoLists.Queries.GetAutoList;

public record GetAutoListQuery(Guid Id) : IRequest<FullAutoListDto>;

public class GetAutoListQueryHandler(IApplicationDbContext dbContext, IMapper mapper)
    : IRequestHandler<GetAutoListQuery, FullAutoListDto>
{
    public async Task<FullAutoListDto> Handle(GetAutoListQuery request, CancellationToken cancellationToken)
    {
        var autoList = await dbContext.AutoLists
            .Where(x => x.Id == request.Id)
            .ProjectTo<FullAutoListDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.Id, autoList);

        return autoList;
    }
}

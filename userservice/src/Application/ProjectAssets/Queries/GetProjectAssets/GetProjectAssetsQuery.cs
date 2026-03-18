using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Models;
using UserService.Application.ProjectAssets.Dto;
using UserService.Domain.Enums;

namespace UserService.Application.ProjectAssets.Queries.GetProjectAssets;

public record GetProjectAssetsQuery(
    Guid ProjectId,
    AssetLifetime Lifetime,
    DateTimeOffset? Cursor = null,
    int PageSize = 20)
    : IRequest<CursorPagedList<ProjectAssetDto>>;

public class GetProjectAssetsQueryHandler(IApplicationDbContext dbContext, IMapper mapper)
    : IRequestHandler<GetProjectAssetsQuery, CursorPagedList<ProjectAssetDto>>
{
    public async Task<CursorPagedList<ProjectAssetDto>> Handle(GetProjectAssetsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.ProjectAssets
            .Where(pa => pa.ProjectId == request.ProjectId && pa.Lifetime == request.Lifetime);

        if (request.Cursor.HasValue)
            query = query.Where(pa => pa.Created < request.Cursor.Value);

        var items = await query
            .OrderByDescending(pa => pa.Created)
            .Take(request.PageSize + 1)
            .ToListAsync(cancellationToken);

        var hasNextPage = items.Count > request.PageSize;
        if (hasNextPage) items.RemoveAt(items.Count - 1);

        var nextCursor = hasNextPage ? items[^1].Created : (DateTimeOffset?)null;
        var dtos = mapper.Map<IReadOnlyList<ProjectAssetDto>>(items);

        return new CursorPagedList<ProjectAssetDto>(dtos, nextCursor);
    }
}

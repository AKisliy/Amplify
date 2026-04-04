using UserService.Application.Common.Interfaces;
using UserService.Application.ProjectAssets.Dto;
using UserService.Domain.Entities;

namespace UserService.Application.ProjectAssets.Queries.GetProjectAsset;

public record GetProjectAssetQuery(Guid Id) : IRequest<ProjectAssetDto>;

public class GetProjectAssetQueryHandler(IApplicationDbContext dbContext, IMapper mapper)
    : IRequestHandler<GetProjectAssetQuery, ProjectAssetDto>
{
    public async Task<ProjectAssetDto> Handle(GetProjectAssetQuery request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.ProjectAssets.FindAsync(new object[] { request.Id }, cancellationToken);

        Guard.Against.NotFound(request.Id, entity, nameof(ProjectAsset));

        return mapper.Map<ProjectAssetDto>(entity);
    }
}
using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Common.Models;
using UserService.Application.ProjectAssets.Dto;
using UserService.Application.ProjectAssets.Queries.GetProjectAsset;
using UserService.Application.ProjectAssets.Queries.GetProjectAssets;
using UserService.Domain.Enums;

namespace UserService.Web.Endpoints;

public class ProjectAssets : EndpointGroupBase
{
    public override string? GroupName => "project-assets";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetProjectAssets, "{id}").RequireAuthorization();

        groupBuilder.MapGet(GetProjectAsset, "item/{id}").RequireAuthorization();
    }

    public async Task<Ok<CursorPagedList<ProjectAssetDto>>> GetProjectAssets(
        ISender sender,
        Guid id,
        DateTimeOffset? cursor = null,
        int pageSize = 20,
        AssetLifetime lifetime = AssetLifetime.Permanent,
        CancellationToken cancellationToken = default)
    {
        var result = await sender.Send(new GetProjectAssetsQuery(
            id,
            lifetime,
            cursor,
            pageSize));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<ProjectAssetDto>> GetProjectAsset(ISender sender, Guid id)
    {
        var result = await sender.Send(new GetProjectAssetQuery(id));
        return TypedResults.Ok(result);
    }
}
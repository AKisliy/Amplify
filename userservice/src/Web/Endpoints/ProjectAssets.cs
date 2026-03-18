using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Common.Models;
using UserService.Application.ProjectAssets.Dto;
using UserService.Application.ProjectAssets.Queries.GetProjectAssets;

namespace UserService.Web.Endpoints;

public class ProjectAssets : EndpointGroupBase
{
    public override string? GroupName => "project-assets";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetProjectAssets, "{id}").RequireAuthorization();
    }

    public async Task<Ok<CursorPagedList<ProjectAssetDto>>> GetProjectAssets(
        ISender sender, Guid id, DateTimeOffset? cursor = null, int pageSize = 20)
    {
        var result = await sender.Send(new GetProjectAssetsQuery(id, cursor, pageSize));
        return TypedResults.Ok(result);
    }
}
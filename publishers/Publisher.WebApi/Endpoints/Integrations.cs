using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.Integrations.Queries;
using Publisher.WebApi.Infrastructure;

namespace Publisher.WebApi.Endpoints;

public class Integrations : EndpointGroupBase
{
    public override string? GroupName => "integrations";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet("instagram/auth-url", GetInstagramAuthUrl);
    }

    public async Task<Ok<string>> GetInstagramAuthUrl(ISender sender)
    {
        var query = new GetInstagramAuthUrlQuery();
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }
}

using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Enums;
using Publisher.Application.Connections.Queries.GetProjectConnections;
using Publisher.Application.Connections.Queries;
using Publisher.Application.Connections.Commands;

namespace Publisher.Web.Endpoints;

public class Connections : EndpointGroupBase
{
    public override string? GroupName => "connections";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet("{projectId}/auth-url", GetAuthUrl);
        groupBuilder.MapPost(Connection);

        groupBuilder.MapGet("{projectId}", GetProjectIntegrations);
    }

    public async Task<Ok<AuthUrlResponse>> GetAuthUrl(ISender sender, Guid projectId, SocialProvider provider)
    {
        var query = new GetAuthUrlQuery(projectId, provider);
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }

    public async Task<RedirectHttpResult> Connection(ISender sender, string state, string code)
    {
        var command = new CreateNewConnection(state, code);
        var result = await sender.Send(command);
        return TypedResults.Redirect(result.RedirectUrl);
    }

    public async Task<Ok<ConnectionsVm>> GetProjectIntegrations(ISender sender, Guid projectId)
    {
        var query = new GetProjectIntegrationsQuery(projectId);

        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }
}
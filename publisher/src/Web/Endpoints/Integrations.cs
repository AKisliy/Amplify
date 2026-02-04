using Publisher.Application.Common.Models.Instagram;
using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.Integrations.Queries;
using Publisher.Application.Integrations.Commands.ConnectInstagramAccount;
using Publisher.Application.Integrations.Queries.GetProjectIntegrations;

namespace Publisher.Web.Endpoints;

public class Integrations : EndpointGroupBase
{
    public override string? GroupName => "integrations";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet("{projectId}/instagram/auth-url", GetInstagramAuthUrl);
        groupBuilder.MapPost("{projectId}/instagram/connect", ConnectInstagramAccount);

        groupBuilder.MapGet("{projectId}", GetProjectIntegrations);
    }

    public async Task<Ok<InstagramAuthUrl>> GetInstagramAuthUrl(ISender sender, Guid projectId)
    {
        var query = new GetInstagramAuthUrlQuery();
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }

    public async Task<Ok> ConnectInstagramAccount(ISender sender, Guid projectId, string code)
    {
        var command = new ConnectInstagramAccountCommand(code, projectId);
        await sender.Send(command);
        return TypedResults.Ok();
    }

    public async Task<Ok<IntegrationsVm>> GetProjectIntegrations(ISender sender, Guid projectId)
    {
        var query = new GetProjectIntegrationsQuery(projectId);

        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }
}

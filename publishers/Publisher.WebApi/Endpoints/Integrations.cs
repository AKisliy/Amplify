using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.Integrations.Commands.ConnectInstagramAccount;
using Publisher.Application.Integrations.Queries;
using Publisher.WebApi.Infrastructure;

namespace Publisher.WebApi.Endpoints;

public class Integrations : EndpointGroupBase
{
    public override string? GroupName => "integrations";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet("instagram/auth-url", GetInstagramAuthUrl);
        groupBuilder.MapGet("instagram/callback", InstagramCallback);
        groupBuilder.MapPost("instagram/connect", ConnectInstagramAccount);
    }

    public async Task<Ok<InstargramAuthUrl>> GetInstagramAuthUrl(ISender sender)
    {
        var query = new GetInstagramAuthUrlQuery();
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }

    public async Task<Ok> ConnectInstagramAccount(ISender sender, string code)
    {
        var command = new ConnectInstagramAccountCommand(code);
        await sender.Send(command);
        return TypedResults.Ok();
    }

    public Task<Ok> InstagramCallback(ISender sender, string code)
    {
        Console.WriteLine("Instagram callback received with code: " + code);

        return Task.FromResult(TypedResults.Ok());
    }
}

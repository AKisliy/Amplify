using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.SocialMediaAccounts.Commands.CreateSocialMediaAccount;
using Publisher.WebApi.Infrastructure;

namespace Publisher.WebApi.Endpoints;

public class SocialMediaAccounts : EndpointGroupBase
{
    public override string? GroupName => "social-media-account";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateSocialMediaAccount);
    }

    public async Task<Created<Guid>> CreateSocialMediaAccount(ISender sender, CreateSocialMediaAccountCommand command)
    {
        var id = await sender.Send(command);

        return TypedResults.Created($"/{GroupName}/{id}", id);
    }
}

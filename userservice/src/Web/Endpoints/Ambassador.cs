
using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Ambassadors.Commands.CreateAmbassador;

namespace UserService.Web.Endpoints;

public class Ambassador : EndpointGroupBase
{
    public override string? GroupName => "ambassador";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateAmbassador).RequireAuthorization();
    }

    public async Task<Created<Guid>> CreateAmbassador(ISender sender, CreateAmbassadorCommand command)
    {
        var id = await sender.Send(command);
        return TypedResults.Created($"/{GroupName}/{id}", id);
    }
}

using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Ambassadors.Commands.CreateAmbassador;
using UserService.Application.Ambassadors.Commands.DeleteAmbassador;
using UserService.Application.Ambassadors.Commands.UpdateAmbassador;

namespace UserService.Web.Endpoints;

public class Ambassadors : EndpointGroupBase
{
    public override string? GroupName => "ambassadors";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateAmbassador).RequireAuthorization();
        groupBuilder.MapPut(UpdateAmbassador, "{id}").RequireAuthorization();
        groupBuilder.MapDelete(DeleteAmbassador, "{id}").RequireAuthorization();
    }

    public async Task<Created<Guid>> CreateAmbassador(ISender sender, CreateAmbassadorCommand command)
    {
        var id = await sender.Send(command);
        return TypedResults.Created($"/{GroupName}/{id}", id);
    }

    public async Task<Results<NoContent, BadRequest>> UpdateAmbassador(ISender sender, Guid id, UpdateAmbassadorCommand command)
    {
        if (id != command.Id) return TypedResults.BadRequest();

        await sender.Send(command);

        return TypedResults.NoContent();
    }

    public async Task<NoContent> DeleteAmbassador(ISender sender, Guid id)
    {
        await sender.Send(new DeleteAmbassadorCommand(id));

        return TypedResults.NoContent();
    }
}

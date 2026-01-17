using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.AmbassadorImages.Queries.GetAmbassadorImages;
using UserService.Application.Ambassadors.Commands.CreateAmbassador;
using UserService.Application.Ambassadors.Commands.DeleteAmbassador;
using UserService.Application.Ambassadors.Commands.UpdateAmbassador;
using UserService.Application.Ambassadors.Queries.GetAmbassador;

namespace UserService.Web.Endpoints;

public class Ambassadors : EndpointGroupBase
{
    public override string? GroupName => "ambassadors";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateAmbassador).RequireAuthorization();
        groupBuilder.MapPut(UpdateAmbassador, "{id}").RequireAuthorization();
        groupBuilder.MapDelete(DeleteAmbassador, "{id}").RequireAuthorization();
        groupBuilder.MapGet(GetAmbassador, "{id}").RequireAuthorization();
        groupBuilder.MapGet(GetAmbassadorImages, "{id}/images").RequireAuthorization();
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

    public async Task<Ok<AmbassadorDto>> GetAmbassador(ISender sender, Guid id)
    {
        var result = await sender.Send(new GetAmbassadorQuery(id));

        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyCollection<AmbassadorImageDto>>> GetAmbassadorImages(ISender sender, Guid id)
    {
        var query = new GetAmbassadorImagesQuery(id);
        var result = await sender.Send(query);
        return TypedResults.Ok(result);
    }

    // public async Task<Results<NoContent, NotFound>> DeleteAmbassadorImage(ISender sender, Guid ambassadorId, Guid imageId)
    // {
    //     var command = new DeleteAmbassadorImageCommand(ambassadorId, imageId);
    //     var result = await sender.Send(command);

    //     return result.IsSuccess ? TypedResults.NoContent() : TypedResults.NotFound();
    // }
}

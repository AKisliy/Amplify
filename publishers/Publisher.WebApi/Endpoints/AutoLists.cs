using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.AutoLists.Commands.CreateAutoList;
using Publisher.Application.AutoLists.Commands.DeleteAutoList;
using Publisher.Application.AutoLists.Commands.UpdateAutoList;
using Publisher.Application.AutoLists.Queries.GetAutoLists;
using Publisher.WebApi.Infrastructure;

namespace Publisher.WebApi.Endpoints;

public class AutoLists : EndpointGroupBase
{
    public override string? GroupName => "autolist";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateAutoList);
        groupBuilder.MapGet(GetAutoListsForActor);
        groupBuilder.MapPut(UpdateAutoList, "{id}");
        groupBuilder.MapDelete(DeleteAutoList, "{id}");
    }

    public async Task<Created<Guid>> CreateAutoList(ISender sender, CreateAutoListCommand command)
    {
        var id = await sender.Send(command);

        return TypedResults.Created($"/{GroupName}/{id}", id);
    }

    public async Task<Ok<AutoListsVm>> GetAutoListsForActor(ISender sender, [AsParameters] GetAutoListsQuery query)
    {
        var result = await sender.Send(query);

        return TypedResults.Ok(result);
    }

    public async Task<Results<NoContent, BadRequest>> UpdateAutoList(ISender sender, Guid id, UpdateAutoListCommand command)
    {
        if (id != command.Id)
            return TypedResults.BadRequest();

        await sender.Send(command);

        return TypedResults.NoContent();
    }

    public async Task<NoContent> DeleteAutoList(ISender sender, Guid id)
    {
        await sender.Send(new DeleteAutoListCommand(id));

        return TypedResults.NoContent();
    }
}

using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.AutoLists.Commands.CreateAutoList;
using Publisher.Application.AutoLists.Commands.DeleteAutoList;
using Publisher.Application.AutoLists.Commands.UpdateAutoList;
using Publisher.Application.AutoLists.Queries.GetAutoList;
using Publisher.Application.AutoLists.Queries.GetAutoLists;

namespace Publisher.Web.Endpoints;

public class AutoLists : EndpointGroupBase
{
    public override string? GroupName => "autolists";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateAutoList);
        groupBuilder.MapGet(GetAutoList, "{id}");
        groupBuilder.MapGet(GetAutoListsForProject).RequireAuthorization();
        groupBuilder.MapPut(UpdateAutoList, "{id}");
        groupBuilder.MapDelete(DeleteAutoList, "{id}");
    }

    public async Task<Created<Guid>> CreateAutoList(ISender sender, CreateAutoListCommand command)
    {
        var id = await sender.Send(command);

        return TypedResults.Created($"/{GroupName}/{id}", id);
    }

    public async Task<Ok<FullAutoListDto>> GetAutoList(ISender sender, Guid id)
    {
        var result = await sender.Send(new GetAutoListQuery(id));

        return TypedResults.Ok(result);
    }

    public async Task<Ok<AutoListsVm>> GetAutoListsForProject(ISender sender, [AsParameters] GetAutoListsQuery query)
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

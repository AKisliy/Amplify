using Microsoft.AspNetCore.Http.HttpResults;
using Publisher.Application.AutoListEntries.Commands.CreateAutoListEntry;
using Publisher.Application.AutoListEntries.Commands.DeleteAutoListEntry;
using Publisher.Application.AutoListEntries.Commands.UpdateAutoListEntry;
using Publisher.WebApi.Infrastructure;

namespace Publisher.WebApi.Endpoints;

public class AutoListEntries : EndpointGroupBase
{
    public override string? GroupName => "autolistentry";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateAutoListEntry);
        groupBuilder.MapPut(UpdateAutoListEntry, "{id}");
        groupBuilder.MapDelete(DeleteAutoListEntry, "{id}");
    }

    public async Task<Created<Guid>> CreateAutoListEntry(ISender sender, CreateAutoListEntryCommand command)
    {
        var id = await sender.Send(command);

        return TypedResults.Created($"/{GroupName}/{id}", id);
    }

    public async Task<Results<NoContent, BadRequest>> UpdateAutoListEntry(ISender sender, Guid id, UpdateAutoListEntryCommand command)
    {
        if (id != command.Id)
            return TypedResults.BadRequest();

        await sender.Send(command);

        return TypedResults.NoContent();
    }

    public async Task<NoContent> DeleteAutoListEntry(ISender sender, Guid id)
    {
        await sender.Send(new DeleteAutoListEntryCommand(id));

        return TypedResults.NoContent();
    }
}

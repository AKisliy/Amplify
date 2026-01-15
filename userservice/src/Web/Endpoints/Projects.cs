using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Projects.Commands.CreateProject;
using UserService.Application.Projects.Commands.DeleteProject;

namespace UserService.Web.Endpoints;

public class Projects : EndpointGroupBase
{
    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateProject).RequireAuthorization();
        groupBuilder.MapDelete(DeleteProject, "{id}").RequireAuthorization();
    }

    public async Task<Created<Guid>> CreateProject(ISender sender, CreateProjectCommand command)
    {
        var id = await sender.Send(command);
        return TypedResults.Created($"/{nameof(Projects)}/{id}", id);
    }

    public async Task<NoContent> DeleteProject(ISender sender, Guid id)
    {
        await sender.Send(new DeleteProjectCommand(id));

        return TypedResults.NoContent();
    }
}

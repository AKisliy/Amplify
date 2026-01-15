
using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Web.Endpoints;

public class Projects : EndpointGroupBase
{
    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateProject).RequireAuthorization();
    }

    public async Task<Created<Guid>> CreateProject(ISender sender, CreateProjectCommand command)
    {
        var id = await sender.Send(command);
        return TypedResults.Created($"/{nameof(Projects)}/{id}", id);
    }
}

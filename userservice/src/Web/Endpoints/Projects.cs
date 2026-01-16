using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Projects.Commands.CreateProject;
using UserService.Application.Projects.Commands.DeleteProject;
using UserService.Application.Projects.Commands.UpdateProject;
using UserService.Application.Projects.GetUserProjects.Queries;
using UserService.Application.Projects.Queries.GetUserProjects;

namespace UserService.Web.Endpoints;

public class Projects : EndpointGroupBase
{
    public override string? GroupName => "projects";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(CreateProject).RequireAuthorization();
        groupBuilder.MapDelete(DeleteProject, "{id}").RequireAuthorization();
        groupBuilder.MapPut(UpdateProject, "{id}").RequireAuthorization();

        groupBuilder.MapGet(GetUserProjects).RequireAuthorization();
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

    public async Task<Results<NoContent, BadRequest>> UpdateProject(ISender sender, Guid id, UpdateProjectCommand command)
    {
        if (id != command.Id) return TypedResults.BadRequest();

        await sender.Send(command);

        return TypedResults.NoContent();
    }

    public async Task<Ok<IReadOnlyCollection<ProjectDto>>> GetUserProjects(ISender sender)
    {
        var result = await sender.Send(new GetUserProjectsQuery());

        return TypedResults.Ok(result);
    }
}

using UserService.Application.Projects.Commands.CreateProject;
using UserService.Application.Projects.GetUserProjects.Queries;
using UserService.Application.Projects.Queries.GetProject;

namespace UserService.Application.FunctionalTests.Projects;

using static Testing;

[TestFixture]
public class GetProjectTests : BaseTestFixture
{
    [Test]
    public async Task ShouldThrowForNonExistentProject()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new GetProjectQuery(Guid.NewGuid())));
    }

    [Test]
    public async Task ShouldGetProject()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("My Project", "My Description", null));

        var result = await SendAsync(new GetProjectQuery(projectId));

        result.ShouldNotBeNull();
        result.Id.ShouldBe(projectId);
        result.Name.ShouldBe("My Project");
        result.Description.ShouldBe("My Description");
    }

    [Test]
    public async Task ShouldDenyAccessToAnotherUsersProject()
    {
        await RunAsDefaultUserAsync();
        var projectId = await SendAsync(new CreateProjectCommand("Owner's Project", null, null));

        await RunAsUserAsync("other@local", "Testing1234!", []);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new GetProjectQuery(projectId)));
    }

    [Test]
    public async Task ShouldGetUserProjectsList()
    {
        await RunAsDefaultUserAsync();

        await SendAsync(new CreateProjectCommand("Project A", null, null));
        await SendAsync(new CreateProjectCommand("Project B", "Desc B", null));

        var projects = await SendAsync(new GetUserProjectsQuery());

        projects.ShouldNotBeNull();
        projects.Count.ShouldBe(2);
    }

    [Test]
    public async Task ShouldReturnEmptyListForNewUser()
    {
        await RunAsDefaultUserAsync();

        var projects = await SendAsync(new GetUserProjectsQuery());

        projects.ShouldNotBeNull();
        projects.Count.ShouldBe(0);
    }

    [Test]
    public async Task ShouldReturnOnlyCurrentUsersProjects()
    {
        await RunAsDefaultUserAsync();
        await SendAsync(new CreateProjectCommand("User1 Project", null, null));

        await RunAsUserAsync("other@local", "Testing1234!", []);
        await SendAsync(new CreateProjectCommand("User2 Project", null, null));

        var projects = await SendAsync(new GetUserProjectsQuery());

        projects.Count.ShouldBe(1);
        projects.First().Name.ShouldBe("User2 Project");
    }
}

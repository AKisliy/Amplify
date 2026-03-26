using UserService.Application.Projects.Commands.CreateProject;
using UserService.Application.Projects.Commands.DeleteProject;

namespace UserService.Application.FunctionalTests.Projects;

using static Testing;

[TestFixture]
public class DeleteProjectTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRequireValidProjectId()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new DeleteProjectCommand(Guid.NewGuid())));
    }

    [Test]
    public async Task ShouldDeleteProject()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("To Delete", null, null));

        var beforeDelete = await FindAsync<Project>(projectId);
        beforeDelete.ShouldNotBeNull();

        await SendAsync(new DeleteProjectCommand(projectId));

        var afterDelete = await FindAsync<Project>(projectId);
        afterDelete.ShouldBeNull();
    }

    [Test]
    public async Task ShouldDecreaseProjectCount()
    {
        await RunAsDefaultUserAsync();

        var id1 = await SendAsync(new CreateProjectCommand("Project 1", null, null));
        await SendAsync(new CreateProjectCommand("Project 2", null, null));

        var countBefore = await CountAsync<Project>();
        countBefore.ShouldBe(2);

        await SendAsync(new DeleteProjectCommand(id1));

        var countAfter = await CountAsync<Project>();
        countAfter.ShouldBe(1);
    }
}

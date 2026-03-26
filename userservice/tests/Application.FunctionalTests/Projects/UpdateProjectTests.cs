using UserService.Application.Projects.Commands.CreateProject;
using UserService.Application.Projects.Commands.UpdateProject;

namespace UserService.Application.FunctionalTests.Projects;

using static Testing;

[TestFixture]
public class UpdateProjectTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRequireValidProjectId()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new UpdateProjectCommand(Guid.NewGuid(), "Updated", null, null)));
    }

    [Test]
    public async Task ShouldRequireNonEmptyName()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Original", null, null));

        await Should.ThrowAsync<ValidationException>(async () =>
            await SendAsync(new UpdateProjectCommand(projectId, "", null, null)));
    }

    [Test]
    public async Task ShouldUpdateProject()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Original", "Desc", null));
        var newPhoto = Guid.NewGuid();

        await SendAsync(new UpdateProjectCommand(projectId, "Updated Name", "Updated Desc", newPhoto));

        var project = await FindAsync<Project>(projectId);

        project.ShouldNotBeNull();
        project.Name.ShouldBe("Updated Name");
        project.Description.ShouldBe("Updated Desc");
        project.Photo.ShouldBe(newPhoto);
    }

    [Test]
    public async Task ShouldDenyUpdateByAnotherUser()
    {
        await RunAsDefaultUserAsync();
        var projectId = await SendAsync(new CreateProjectCommand("Owner's Project", null, null));

        // Switch to another user
        await RunAsUserAsync("other@local", "Testing1234!", []);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new UpdateProjectCommand(projectId, "Stolen", null, null)));
    }
}

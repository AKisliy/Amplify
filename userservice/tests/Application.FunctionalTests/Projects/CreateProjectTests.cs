using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Application.FunctionalTests.Projects;

using static Testing;

[TestFixture]
public class CreateProjectTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRequireMinimumFields()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<ValidationException>(async () =>
            await SendAsync(new CreateProjectCommand("", null, null)));
    }

    [Test]
    public async Task ShouldCreateProject()
    {
        var userId = await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("My Project", "Some description", null));

        var project = await FindAsync<Project>(projectId);

        project.ShouldNotBeNull();
        project.Name.ShouldBe("My Project");
        project.Description.ShouldBe("Some description");
        project.Photo.ShouldBeNull();
        project.UserId.ShouldBe(userId!.Value);
        project.Created.ShouldNotBe(default);
    }

    [Test]
    public async Task ShouldCreateProjectWithPhoto()
    {
        await RunAsDefaultUserAsync();

        var photoId = Guid.NewGuid();
        var projectId = await SendAsync(new CreateProjectCommand("Photo Project", null, photoId));

        var project = await FindAsync<Project>(projectId);

        project.ShouldNotBeNull();
        project.Photo.ShouldBe(photoId);
    }

    [Test]
    public async Task ShouldNotAllowDuplicateNameForSameUser()
    {
        await RunAsDefaultUserAsync();

        await SendAsync(new CreateProjectCommand("Duplicate", null, null));

        await Should.ThrowAsync<ValidationException>(async () =>
            await SendAsync(new CreateProjectCommand("Duplicate", null, null)));
    }

    [Test]
    public async Task ShouldReturnProjectId()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Return ID Test", null, null));

        projectId.ShouldNotBe(Guid.Empty);
    }
}

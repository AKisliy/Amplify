using UserService.Application.Ambassadors.Commands.CreateAmbassador;
using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Application.FunctionalTests.Ambassadors;

using static Testing;

[TestFixture]
public class CreateAmbassadorTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRequireValidProjectId()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new CreateAmbassadorCommand("Alex", null, null, null, Guid.NewGuid())));
    }

    [Test]
    public async Task ShouldRequireNonEmptyName()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));

        await Should.ThrowAsync<ValidationException>(async () =>
            await SendAsync(new CreateAmbassadorCommand("", null, null, null, projectId)));
    }

    [Test]
    public async Task ShouldCreateAmbassador()
    {
        var userId = await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));

        var ambassadorId = await SendAsync(new CreateAmbassadorCommand(
            "Alex Ambassador",
            "Biography text",
            "Friendly and helpful",
            "Calm voice",
            projectId));

        var ambassador = await FindAsync<Ambassador>(ambassadorId);

        ambassador.ShouldNotBeNull();
        ambassador.Name.ShouldBe("Alex Ambassador");
        ambassador.Biography.ShouldBe("Biography text");
        ambassador.BehavioralPatterns.ShouldBe("Friendly and helpful");
        ambassador.VoiceDescription.ShouldBe("Calm voice");
        ambassador.ProjectId.ShouldBe(projectId);
        ambassador.CreatedBy.ShouldBe(userId);
    }

    [Test]
    public async Task ShouldReturnAmbassadorId()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        var ambassadorId = await SendAsync(new CreateAmbassadorCommand("Ambassador", null, null, null, projectId));

        ambassadorId.ShouldNotBe(Guid.Empty);
    }

    [Test]
    public async Task ShouldNotAllowDuplicateAmbassadorForSameProject()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        await SendAsync(new CreateAmbassadorCommand("First", null, null, null, projectId));

        await Should.ThrowAsync<InvalidOperationException>(async () =>
            await SendAsync(new CreateAmbassadorCommand("Second", null, null, null, projectId)));
    }

    [Test]
    public async Task ShouldDenyCreatingAmbassadorForAnotherUsersProject()
    {
        await RunAsDefaultUserAsync();
        var projectId = await SendAsync(new CreateProjectCommand("Owner's Project", null, null));

        await RunAsUserAsync("other@local", "Testing1234!", []);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new CreateAmbassadorCommand("Stealer", null, null, null, projectId)));
    }
}

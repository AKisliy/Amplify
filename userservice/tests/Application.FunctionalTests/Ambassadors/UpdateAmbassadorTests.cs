using UserService.Application.Ambassadors.Commands.CreateAmbassador;
using UserService.Application.Ambassadors.Commands.UpdateAmbassador;
using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Application.FunctionalTests.Ambassadors;

using static Testing;

[TestFixture]
public class UpdateAmbassadorTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRequireValidAmbassadorId()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new UpdateAmbassadorCommand(Guid.NewGuid(), "Name", null, null, null, null)));
    }

    [Test]
    public async Task ShouldUpdateAmbassador()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        var ambassadorId = await SendAsync(new CreateAmbassadorCommand("Original", "Bio", "Patterns", "Voice", projectId));

        var profileImageId = Guid.NewGuid();
        await SendAsync(new UpdateAmbassadorCommand(
            ambassadorId,
            "Updated Name",
            "Updated Bio",
            "Updated Patterns",
            "Updated Voice",
            profileImageId));

        var ambassador = await FindAsync<Ambassador>(ambassadorId);

        ambassador.ShouldNotBeNull();
        ambassador.Name.ShouldBe("Updated Name");
        ambassador.Biography.ShouldBe("Updated Bio");
        ambassador.BehavioralPatterns.ShouldBe("Updated Patterns");
        ambassador.VoiceDescription.ShouldBe("Updated Voice");
        ambassador.ProfileImageId.ShouldBe(profileImageId);
    }

    [Test]
    public async Task ShouldDenyUpdateByAnotherUser()
    {
        await RunAsDefaultUserAsync();
        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        var ambassadorId = await SendAsync(new CreateAmbassadorCommand("Ambassador", null, null, null, projectId));

        await RunAsUserAsync("other@local", "Testing1234!", []);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new UpdateAmbassadorCommand(ambassadorId, "Stolen", null, null, null, null)));
    }
}

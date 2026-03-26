using UserService.Application.Ambassadors.Commands.CreateAmbassador;
using UserService.Application.Ambassadors.Queries.GetAmbassador;
using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Application.FunctionalTests.Ambassadors;

using static Testing;

[TestFixture]
public class GetAmbassadorTests : BaseTestFixture
{
    [Test]
    public async Task ShouldThrowForNonExistentAmbassador()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new GetAmbassadorQuery(Guid.NewGuid())));
    }

    [Test]
    public async Task ShouldGetAmbassador()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        var ambassadorId = await SendAsync(new CreateAmbassadorCommand(
            "Ambassador Name",
            "Biography",
            "Patterns",
            "Voice",
            projectId));

        var result = await SendAsync(new GetAmbassadorQuery(ambassadorId));

        result.ShouldNotBeNull();
        result.Id.ShouldBe(ambassadorId);
        result.Name.ShouldBe("Ambassador Name");
        result.Biography.ShouldBe("Biography");
        result.BehavioralPatterns.ShouldBe("Patterns");
        result.VoiceDescription.ShouldBe("Voice");
    }

    [Test]
    public async Task ShouldNotReturnAnotherUsersAmbassador()
    {
        await RunAsDefaultUserAsync();
        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        var ambassadorId = await SendAsync(new CreateAmbassadorCommand("Ambassador", null, null, null, projectId));

        // Switch to another user — GetAmbassadorQuery filters by CreatedBy == user.Id
        await RunAsUserAsync("other@local", "Testing1234!", []);

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new GetAmbassadorQuery(ambassadorId)));
    }
}

using UserService.Application.Ambassadors.Commands.CreateAmbassador;
using UserService.Application.Ambassadors.Commands.DeleteAmbassador;
using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Application.FunctionalTests.Ambassadors;

using static Testing;

[TestFixture]
public class DeleteAmbassadorTests : BaseTestFixture
{
    [Test]
    public async Task ShouldRequireValidAmbassadorId()
    {
        await RunAsDefaultUserAsync();

        await Should.ThrowAsync<Exception>(async () =>
            await SendAsync(new DeleteAmbassadorCommand(Guid.NewGuid())));
    }

    [Test]
    public async Task ShouldDeleteAmbassador()
    {
        await RunAsDefaultUserAsync();

        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        var ambassadorId = await SendAsync(new CreateAmbassadorCommand("To Delete", null, null, null, projectId));

        var beforeDelete = await FindAsync<Ambassador>(ambassadorId);
        beforeDelete.ShouldNotBeNull();

        await SendAsync(new DeleteAmbassadorCommand(ambassadorId));

        var afterDelete = await FindAsync<Ambassador>(ambassadorId);
        afterDelete.ShouldBeNull();
    }

    [Test]
    public async Task ShouldDenyDeletionByAnotherUser()
    {
        await RunAsDefaultUserAsync();
        var projectId = await SendAsync(new CreateProjectCommand("Project", null, null));
        var ambassadorId = await SendAsync(new CreateAmbassadorCommand("Ambassador", null, null, null, projectId));

        await RunAsUserAsync("other@local", "Testing1234!", []);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await SendAsync(new DeleteAmbassadorCommand(ambassadorId)));
    }
}

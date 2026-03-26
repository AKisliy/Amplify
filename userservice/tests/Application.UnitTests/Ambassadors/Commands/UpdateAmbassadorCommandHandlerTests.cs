using UserService.Application.Ambassadors.Commands.UpdateAmbassador;

namespace UserService.Application.UnitTests.Ambassadors.Commands;

[TestFixture]
public class UpdateAmbassadorCommandHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private UpdateAmbassadorCommandHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid ProjectId = Guid.NewGuid();
    private static readonly Guid AmbassadorId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _dbContext.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _handler = new UpdateAmbassadorCommandHandler(_dbContext.Object, _user.Object);
    }

    [Test]
    public async Task UpdatesAmbassadorFields()
    {
        var ambassador = new Ambassador { Id = AmbassadorId, Name = "Old", ProjectId = ProjectId };
        var project = new Project { Id = ProjectId, Name = "P", UserId = UserId };
        SetupFindAsync(ambassador, project);

        await _handler.Handle(
            new UpdateAmbassadorCommand(AmbassadorId, "New Name", "Bio", "Patterns", "Voice", null),
            CancellationToken.None);

        ambassador.Name.ShouldBe("New Name");
        ambassador.Biography.ShouldBe("Bio");
        _dbContext.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ThrowsNotFoundWhenAmbassadorDoesNotExist()
    {
        SetupFindAsync(null, null);

        await Should.ThrowAsync<NotFoundException>(async () =>
            await _handler.Handle(
                new UpdateAmbassadorCommand(AmbassadorId, "Name", null, null, null, null),
                CancellationToken.None));
    }

    [Test]
    public async Task ThrowsUnauthorizedWhenUserIsNotProjectOwner()
    {
        var ambassador = new Ambassador { Id = AmbassadorId, Name = "A", ProjectId = ProjectId };
        var project = new Project { Id = ProjectId, Name = "P", UserId = Guid.NewGuid() };
        SetupFindAsync(ambassador, project);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(
                new UpdateAmbassadorCommand(AmbassadorId, "Name", null, null, null, null),
                CancellationToken.None));
    }

    private void SetupFindAsync(Ambassador? ambassador, Project? project)
    {
        var mockAmbassadors = new List<Ambassador>().AsQueryable().BuildMockDbSet();
        mockAmbassadors.Setup(m => m.FindAsync(It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<Ambassador?>(ambassador));
        _dbContext.Setup(c => c.Ambassadors).Returns(mockAmbassadors.Object);

        var mockProjects = new List<Project>().AsQueryable().BuildMockDbSet();
        mockProjects.Setup(m => m.FindAsync(It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<Project?>(project));
        _dbContext.Setup(c => c.Projects).Returns(mockProjects.Object);
    }
}

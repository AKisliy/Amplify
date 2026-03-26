using UserService.Application.Projects.Commands.UpdateProject;

namespace UserService.Application.UnitTests.Projects.Commands;

[TestFixture]
public class UpdateProjectCommandHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private UpdateProjectCommandHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid ProjectId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _dbContext.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        _handler = new UpdateProjectCommandHandler(_dbContext.Object, _user.Object);
    }

    [Test]
    public async Task UpdatesProjectFields()
    {
        var project = new Project { Id = ProjectId, Name = "Old Name", UserId = UserId };
        SetupFindAsync(project);

        await _handler.Handle(
            new UpdateProjectCommand(ProjectId, "New Name", "New Desc", null),
            CancellationToken.None);

        project.Name.ShouldBe("New Name");
        project.Description.ShouldBe("New Desc");
        _dbContext.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ThrowsNotFoundWhenProjectDoesNotExist()
    {
        SetupFindAsync(null);

        await Should.ThrowAsync<NotFoundException>(async () =>
            await _handler.Handle(
                new UpdateProjectCommand(ProjectId, "Name", null, null),
                CancellationToken.None));
    }

    [Test]
    public async Task ThrowsUnauthorizedWhenUserIsNotOwner()
    {
        var project = new Project { Id = ProjectId, Name = "Name", UserId = Guid.NewGuid() };
        SetupFindAsync(project);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(
                new UpdateProjectCommand(ProjectId, "Name", null, null),
                CancellationToken.None));
    }

    private void SetupFindAsync(Project? project)
    {
        var mockSet = new List<Project>().AsQueryable().BuildMockDbSet();
        mockSet.Setup(m => m.FindAsync(It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<Project?>(project));
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);
    }
}

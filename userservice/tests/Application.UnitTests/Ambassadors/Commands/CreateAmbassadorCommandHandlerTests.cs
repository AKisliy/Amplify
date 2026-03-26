using UserService.Application.Ambassadors.Commands.CreateAmbassador;

namespace UserService.Application.UnitTests.Ambassadors.Commands;

[TestFixture]
public class CreateAmbassadorCommandHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private CreateAmbassadorCommandHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid ProjectId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _dbContext.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _handler = new CreateAmbassadorCommandHandler(_dbContext.Object, _user.Object);
    }

    [Test]
    public async Task AddsAmbassadorAndSavesChanges()
    {
        var project = new Project { Id = ProjectId, Name = "P", UserId = UserId };
        SetupProjects([project]);

        var mockAmbassadors = new List<Ambassador>().AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Ambassadors).Returns(mockAmbassadors.Object);

        await _handler.Handle(
            new CreateAmbassadorCommand("Alice", "Bio", null, null, ProjectId),
            CancellationToken.None);

        mockAmbassadors.Verify(m => m.Add(It.Is<Ambassador>(a => a.Name == "Alice")), Times.Once);
        _dbContext.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ThrowsNotFoundWhenProjectDoesNotExist()
    {
        SetupProjects([]);
        var mockAmbassadors = new List<Ambassador>().AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Ambassadors).Returns(mockAmbassadors.Object);

        await Should.ThrowAsync<NotFoundException>(async () =>
            await _handler.Handle(
                new CreateAmbassadorCommand("Alice", null, null, null, ProjectId),
                CancellationToken.None));
    }

    [Test]
    public async Task ThrowsUnauthorizedWhenUserIsNotProjectOwner()
    {
        var project = new Project { Id = ProjectId, Name = "P", UserId = Guid.NewGuid() };
        SetupProjects([project]);
        var mockAmbassadors = new List<Ambassador>().AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Ambassadors).Returns(mockAmbassadors.Object);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(
                new CreateAmbassadorCommand("Alice", null, null, null, ProjectId),
                CancellationToken.None));
    }

    [Test]
    public async Task ThrowsWhenProjectAlreadyHasAmbassador()
    {
        var ambassador = new Ambassador { Id = Guid.NewGuid(), Name = "Existing", ProjectId = ProjectId };
        var project = new Project { Id = ProjectId, Name = "P", UserId = UserId, Ambassador = ambassador };
        SetupProjects([project]);
        var mockAmbassadors = new List<Ambassador>().AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Ambassadors).Returns(mockAmbassadors.Object);

        await Should.ThrowAsync<InvalidOperationException>(async () =>
            await _handler.Handle(
                new CreateAmbassadorCommand("Alice", null, null, null, ProjectId),
                CancellationToken.None));
    }

    private void SetupProjects(List<Project> projects)
    {
        var mockSet = projects.AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);
    }
}

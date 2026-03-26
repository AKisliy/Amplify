using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Application.UnitTests.Projects.Commands;

[TestFixture]
public class CreateProjectCommandHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private CreateProjectCommandHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);

        var mockSet = new List<Project>().AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);
        _dbContext.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        _handler = new CreateProjectCommandHandler(_dbContext.Object, _user.Object);
    }

    [Test]
    public async Task SetsUserIdOnProject()
    {
        Project? captured = null;
        var mockSet = new List<Project>().AsQueryable().BuildMockDbSet();
        mockSet.Setup(m => m.Add(It.IsAny<Project>())).Callback<Project>(p => captured = p);
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);

        await _handler.Handle(
            new CreateProjectCommand("My Project", null, null),
            CancellationToken.None);

        captured.ShouldNotBeNull();
        captured!.UserId.ShouldBe(UserId);
        captured.Name.ShouldBe("My Project");
    }

    [Test]
    public async Task SavesChanges()
    {
        await _handler.Handle(
            new CreateProjectCommand("My Project", null, null),
            CancellationToken.None);

        _dbContext.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public void ThrowsWhenUserIdIsNull()
    {
        _user.SetupGet(u => u.Id).Returns((Guid?)null);

        Should.Throw<Exception>(() =>
            _handler.Handle(new CreateProjectCommand("Name", null, null), CancellationToken.None));
    }
}

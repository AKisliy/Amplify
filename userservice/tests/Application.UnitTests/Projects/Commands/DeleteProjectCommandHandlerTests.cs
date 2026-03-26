using UserService.Application.Projects.Commands.DeleteProject;

namespace UserService.Application.UnitTests.Projects.Commands;

[TestFixture]
public class DeleteProjectCommandHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private DeleteProjectCommandHandler _handler = null!;

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _dbContext.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _handler = new DeleteProjectCommandHandler(_dbContext.Object);
    }

    [Test]
    public async Task RemovesProjectAndSavesChanges()
    {
        var projectId = Guid.NewGuid();
        var project = new Project { Id = projectId, Name = "Test", UserId = Guid.NewGuid() };
        var mockSet = new List<Project> { project }.AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);

        await _handler.Handle(new DeleteProjectCommand(projectId), CancellationToken.None);

        mockSet.Verify(m => m.Remove(project), Times.Once);
        _dbContext.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ThrowsNotFoundWhenProjectDoesNotExist()
    {
        var mockSet = new List<Project>().AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);

        await Should.ThrowAsync<NotFoundException>(async () =>
            await _handler.Handle(new DeleteProjectCommand(Guid.NewGuid()), CancellationToken.None));
    }
}

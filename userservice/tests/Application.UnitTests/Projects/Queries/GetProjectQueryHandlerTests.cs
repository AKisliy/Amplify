using UserService.Application.Projects.Queries.GetProject;
using UserService.Application.Projects.Queries.GetUserProjects;

namespace UserService.Application.UnitTests.Projects.Queries;

[TestFixture]
public class GetProjectQueryHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private Mock<IMapper> _mapper = null!;
    private GetProjectQueryHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _mapper = new Mock<IMapper>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _handler = new GetProjectQueryHandler(_dbContext.Object, _user.Object, _mapper.Object);
    }

    [Test]
    public async Task ReturnsMappedProjectDto()
    {
        var projectId = Guid.NewGuid();
        var project = new Project { Id = projectId, Name = "My Project", UserId = UserId };
        SetupProjects(project);

        var dto = new ProjectDto { Id = projectId, Name = "My Project" };
        _mapper.Setup(m => m.Map<ProjectDto>(project)).Returns(dto);

        var result = await _handler.Handle(new GetProjectQuery(projectId), CancellationToken.None);

        result.ShouldBe(dto);
    }

    [Test]
    public async Task ThrowsUnauthorizedWhenProjectBelongsToAnotherUser()
    {
        var projectId = Guid.NewGuid();
        var project = new Project { Id = projectId, Name = "Other", UserId = Guid.NewGuid() };
        SetupProjects(project);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(new GetProjectQuery(projectId), CancellationToken.None));
    }

    private void SetupProjects(params Project[] projects)
    {
        var mockSet = projects.ToList().AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);
    }
}

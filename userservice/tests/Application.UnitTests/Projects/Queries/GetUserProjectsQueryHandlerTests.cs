using UserService.Application.Projects.GetUserProjects.Queries;
using UserService.Application.Projects.Queries.GetUserProjects;

namespace UserService.Application.UnitTests.Projects.Queries;

[TestFixture]
public class GetUserProjectsQueryHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private Mock<IMapper> _mapper = null!;
    private GetUserProjectsQueryHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _mapper = new Mock<IMapper>();
        _user.SetupGet(u => u.Id).Returns(UserId);

        _mapper.Setup(m => m.Map<IReadOnlyCollection<ProjectDto>>(It.IsAny<IEnumerable<Project>>()))
            .Returns((IEnumerable<Project> src) => src
                .Select(p => new ProjectDto { Id = p.Id, Name = p.Name })
                .ToList());

        _handler = new GetUserProjectsQueryHandler(_dbContext.Object, _user.Object, _mapper.Object);
    }

    [Test]
    public async Task ReturnsOnlyCurrentUserProjects()
    {
        var now = DateTimeOffset.UtcNow;
        var projects = new List<Project>
        {
            new() { Id = Guid.NewGuid(), Name = "Mine", UserId = UserId, Created = now },
            new() { Id = Guid.NewGuid(), Name = "Others", UserId = Guid.NewGuid(), Created = now },
        };
        SetupProjects(projects);

        var result = await _handler.Handle(new GetUserProjectsQuery(), CancellationToken.None);

        result.Count.ShouldBe(1);
        result.Single().Name.ShouldBe("Mine");
    }

    [Test]
    public async Task ReturnsProjectsOrderedByCreatedDescending()
    {
        var now = DateTimeOffset.UtcNow;
        var projects = new List<Project>
        {
            new() { Id = Guid.NewGuid(), Name = "Oldest", UserId = UserId, Created = now.AddDays(-2) },
            new() { Id = Guid.NewGuid(), Name = "Newest", UserId = UserId, Created = now },
            new() { Id = Guid.NewGuid(), Name = "Middle", UserId = UserId, Created = now.AddDays(-1) },
        };
        SetupProjects(projects);

        var result = await _handler.Handle(new GetUserProjectsQuery(), CancellationToken.None);

        result.First().Name.ShouldBe("Newest");
        result.Last().Name.ShouldBe("Oldest");
    }

    [Test]
    public async Task ReturnsEmptyWhenUserHasNoProjects()
    {
        SetupProjects([]);

        var result = await _handler.Handle(new GetUserProjectsQuery(), CancellationToken.None);

        result.ShouldBeEmpty();
    }

    private void SetupProjects(List<Project> projects)
    {
        var mockSet = projects.AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);
    }
}

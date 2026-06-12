using UserService.Application.Analytics.Queries.Global;

namespace UserService.Application.UnitTests.Analytics.Queries;

[TestFixture]
public class GetGlobalOutputVolumeQueryHandlerTests
{
    private Mock<IApplicationDbContext> _db = null!;
    private Mock<IUser> _user = null!;
    private GetGlobalOutputVolumeQueryHandler _handler = null!;

    private static readonly Guid UserId    = Guid.NewGuid();
    private static readonly Guid ProjectId = Guid.NewGuid();

    private static readonly DateOnly From = new(2026, 5, 1);
    private static readonly DateOnly To   = new(2026, 5, 31);

    [SetUp]
    public void SetUp()
    {
        _db   = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _handler = new GetGlobalOutputVolumeQueryHandler(_db.Object, _user.Object);
    }

    private void SetupProjects(params Project[] projects)
        => _db.Setup(d => d.Projects).Returns(projects.AsQueryable().BuildMockDbSet().Object);

    private void SetupJobExecutions(params JobExecution[] jobs)
        => _db.Setup(d => d.JobExecutions).Returns(jobs.AsQueryable().BuildMockDbSet().Object);

    private static Project OwnedProject(Guid? id = null) => new()
    {
        Id = id ?? ProjectId, Name = "P", UserId = UserId,
    };

    private static JobExecution Job(Guid projectId, DateTime startedAt, string status) => new()
    {
        JobId      = Guid.NewGuid(),
        ProjectId  = projectId,
        StartedAt  = startedAt,
        Status     = status,
        TemplateId = Guid.NewGuid(),
    };

    private static DateTime Day(int day) => new(2026, 5, day, 12, 0, 0, DateTimeKind.Utc);

    [Test]
    public async Task ReturnsEmptyWhenUserHasNoProjects()
    {
        SetupProjects();
        SetupJobExecutions();

        var result = await _handler.Handle(new GetGlobalOutputVolumeQuery(From, To), CancellationToken.None);

        result.ShouldBeEmpty();
    }

    [Test]
    public async Task GroupsByDateWithCompletedAndFailedCounts()
    {
        SetupProjects(OwnedProject());
        SetupJobExecutions(
            Job(ProjectId, Day(1), "COMPLETED"),
            Job(ProjectId, Day(1), "COMPLETED"),
            Job(ProjectId, Day(1), "FAILED"),
            Job(ProjectId, Day(2), "COMPLETED"));

        var result = await _handler.Handle(new GetGlobalOutputVolumeQuery(From, To), CancellationToken.None);

        result.Count.ShouldBe(2);

        var day1 = result.Single(r => r.Date == new DateOnly(2026, 5, 1));
        day1.Completed.ShouldBe(2);
        day1.Failed.ShouldBe(1);

        var day2 = result.Single(r => r.Date == new DateOnly(2026, 5, 2));
        day2.Completed.ShouldBe(1);
        day2.Failed.ShouldBe(0);
    }

    [Test]
    public async Task ResultIsOrderedByDateAscending()
    {
        SetupProjects(OwnedProject());
        SetupJobExecutions(
            Job(ProjectId, Day(10), "COMPLETED"),
            Job(ProjectId, Day(3),  "COMPLETED"),
            Job(ProjectId, Day(7),  "COMPLETED"));

        var result = await _handler.Handle(new GetGlobalOutputVolumeQuery(From, To), CancellationToken.None);

        result[0].Date.Day.ShouldBe(3);
        result[1].Date.Day.ShouldBe(7);
        result[2].Date.Day.ShouldBe(10);
    }

    [Test]
    public async Task ExcludesJobsFromOtherUsersProjects()
    {
        var otherProject = Guid.NewGuid();
        SetupProjects(OwnedProject());
        SetupJobExecutions(
            Job(ProjectId,    Day(1), "COMPLETED"),
            Job(otherProject, Day(1), "COMPLETED"));

        var result = await _handler.Handle(new GetGlobalOutputVolumeQuery(From, To), CancellationToken.None);

        result.Single().Completed.ShouldBe(1);
    }

    [Test]
    public async Task ExcludesJobsOutsideDateRange()
    {
        SetupProjects(OwnedProject());
        SetupJobExecutions(
            Job(ProjectId, Day(15),                                              "COMPLETED"),
            Job(ProjectId, new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc), "COMPLETED"));

        var result = await _handler.Handle(new GetGlobalOutputVolumeQuery(From, To), CancellationToken.None);

        result.Count.ShouldBe(1);
    }

    [Test]
    public async Task AggregatesAcrossMultipleProjects()
    {
        var projectA = Guid.NewGuid();
        var projectB = Guid.NewGuid();
        SetupProjects(OwnedProject(projectA), OwnedProject(projectB));
        SetupJobExecutions(
            Job(projectA, Day(1), "COMPLETED"),
            Job(projectB, Day(1), "COMPLETED"),
            Job(projectB, Day(1), "FAILED"));

        var result = await _handler.Handle(new GetGlobalOutputVolumeQuery(From, To), CancellationToken.None);

        var day1 = result.Single();
        day1.Completed.ShouldBe(2);
        day1.Failed.ShouldBe(1);
    }
}

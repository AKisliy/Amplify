using UserService.Application.Analytics.Queries.Global;

namespace UserService.Application.UnitTests.Analytics.Queries;

[TestFixture]
public class GetEntityEfficiencyQueryHandlerTests
{
    private Mock<IApplicationDbContext> _db = null!;
    private Mock<IUser> _user = null!;
    private GetEntityEfficiencyQueryHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    private static readonly DateOnly From = new(2026, 5, 1);
    private static readonly DateOnly To   = new(2026, 5, 31);

    [SetUp]
    public void SetUp()
    {
        _db   = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _handler = new GetEntityEfficiencyQueryHandler(_db.Object, _user.Object);
    }

    private void SetupProjects(params Project[] projects)
        => _db.Setup(d => d.Projects).Returns(projects.AsQueryable().BuildMockDbSet().Object);

    private void SetupSpendLogs(params GenerationSpendLog[] logs)
        => _db.Setup(d => d.GenerationSpendLogs).Returns(logs.AsQueryable().BuildMockDbSet().Object);

    private void SetupJobExecutions(params JobExecution[] jobs)
        => _db.Setup(d => d.JobExecutions).Returns(jobs.AsQueryable().BuildMockDbSet().Object);

    private static Project OwnedProject(Guid id, string name = "Project") => new()
    {
        Id = id, Name = name, UserId = UserId,
    };

    private static GenerationSpendLog SpendLog(Guid projectId, double cost) => new()
    {
        RequestId  = Guid.NewGuid().ToString(),
        ProjectId  = projectId,
        OccurredAt = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc),
        Model      = "gemini-pro",
        CostUsd    = cost,
    };

    private static JobExecution CompletedJob(Guid projectId) => new()
    {
        JobId      = Guid.NewGuid(),
        ProjectId  = projectId,
        StartedAt  = new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc),
        Status     = "COMPLETED",
        TemplateId = Guid.NewGuid(),
    };

    [Test]
    public async Task ReturnsEmptyWhenUserHasNoProjects()
    {
        SetupProjects();
        SetupSpendLogs();
        SetupJobExecutions();

        var result = await _handler.Handle(new GetEntityEfficiencyQuery(From, To), CancellationToken.None);

        result.ShouldBeEmpty();
    }

    [Test]
    public async Task ComputesAvgCpaPerProject()
    {
        var projectId = Guid.NewGuid();
        SetupProjects(OwnedProject(projectId, "Alpha"));
        SetupSpendLogs(
            SpendLog(projectId, 3.00),
            SpendLog(projectId, 1.00));
        SetupJobExecutions(
            CompletedJob(projectId),
            CompletedJob(projectId));

        var result = await _handler.Handle(new GetEntityEfficiencyQuery(From, To), CancellationToken.None);

        var dto = result.Single();
        dto.TotalCostUsd.ShouldBe(4.00, tolerance: 0.001);
        dto.CompletedJobCount.ShouldBe(2);
        dto.AvgCpa.ShouldBe(2.00, tolerance: 0.001);
    }

    [Test]
    public async Task AvgCpaIsZeroWhenNoCompletedJobs()
    {
        var projectId = Guid.NewGuid();
        SetupProjects(OwnedProject(projectId));
        SetupSpendLogs(SpendLog(projectId, 1.00));
        SetupJobExecutions();

        var result = await _handler.Handle(new GetEntityEfficiencyQuery(From, To), CancellationToken.None);

        result.Single().AvgCpa.ShouldBe(0);
    }

    [Test]
    public async Task IncludesProjectsWithNoActivityAsZeroes()
    {
        var activeProject  = Guid.NewGuid();
        var silentProject  = Guid.NewGuid();
        SetupProjects(OwnedProject(activeProject, "Active"), OwnedProject(silentProject, "Silent"));
        SetupSpendLogs(SpendLog(activeProject, 2.00));
        SetupJobExecutions(CompletedJob(activeProject));

        var result = await _handler.Handle(new GetEntityEfficiencyQuery(From, To), CancellationToken.None);

        result.Count.ShouldBe(2);
        result.Single(r => r.ProjectId == silentProject).TotalCostUsd.ShouldBe(0);
    }

    [Test]
    public async Task OnlyCountsCompletedJobsInCpaCalculation()
    {
        var projectId = Guid.NewGuid();
        SetupProjects(OwnedProject(projectId));
        SetupSpendLogs(SpendLog(projectId, 4.00));
        SetupJobExecutions(
            CompletedJob(projectId),
            new JobExecution
            {
                JobId = Guid.NewGuid(), ProjectId = projectId,
                StartedAt = new DateTime(2026, 5, 15, 0, 0, 0, DateTimeKind.Utc),
                Status = "FAILED", TemplateId = Guid.NewGuid(),
            });

        var result = await _handler.Handle(new GetEntityEfficiencyQuery(From, To), CancellationToken.None);

        result.Single().CompletedJobCount.ShouldBe(1);
        result.Single().AvgCpa.ShouldBe(4.00, tolerance: 0.001);
    }

    [Test]
    public async Task ResultIsOrderedByTotalCostDescending()
    {
        var cheap     = Guid.NewGuid();
        var expensive = Guid.NewGuid();
        SetupProjects(OwnedProject(cheap, "Cheap"), OwnedProject(expensive, "Expensive"));
        SetupSpendLogs(
            SpendLog(cheap,     1.00),
            SpendLog(expensive, 9.00));
        SetupJobExecutions(CompletedJob(cheap), CompletedJob(expensive));

        var result = await _handler.Handle(new GetEntityEfficiencyQuery(From, To), CancellationToken.None);

        result[0].ProjectId.ShouldBe(expensive);
        result[1].ProjectId.ShouldBe(cheap);
    }

    [Test]
    public async Task ExcludesOtherUsersProjects()
    {
        var myProject    = Guid.NewGuid();
        var otherProject = Guid.NewGuid();
        SetupProjects(OwnedProject(myProject));
        // otherProject has no entry in Projects, so it won't be in projectIds
        SetupSpendLogs(
            SpendLog(myProject,    1.00),
            SpendLog(otherProject, 99.0));
        SetupJobExecutions(CompletedJob(myProject));

        var result = await _handler.Handle(new GetEntityEfficiencyQuery(From, To), CancellationToken.None);

        result.Single().TotalCostUsd.ShouldBe(1.00, tolerance: 0.001);
    }
}

using UserService.Application.Analytics.Queries.Global;

namespace UserService.Application.UnitTests.Analytics.Queries;

[TestFixture]
public class GetGlobalSpendSummaryQueryHandlerTests
{
    private Mock<IApplicationDbContext> _db = null!;
    private Mock<IUser> _user = null!;
    private GetGlobalSpendSummaryQueryHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid ProjectId = Guid.NewGuid();

    private static readonly DateOnly From = new(2026, 5, 1);
    private static readonly DateOnly To = new(2026, 5, 31);

    [SetUp]
    public void SetUp()
    {
        _db = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _handler = new GetGlobalSpendSummaryQueryHandler(_db.Object, _user.Object);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void SetupProjects(params Project[] projects)
        => _db.Setup(d => d.Projects).Returns(projects.AsQueryable().BuildMockDbSet().Object);

    private void SetupSpendLogs(params GenerationSpendLog[] logs)
        => _db.Setup(d => d.GenerationSpendLogs).Returns(logs.AsQueryable().BuildMockDbSet().Object);

    private void SetupJobExecutions(params JobExecution[] jobs)
        => _db.Setup(d => d.JobExecutions).Returns(jobs.AsQueryable().BuildMockDbSet().Object);

    private static Project OwnedProject(Guid? id = null) => new()
    {
        Id = id ?? ProjectId,
        Name = "P",
        UserId = UserId,
    };

    private static GenerationSpendLog SpendLog(Guid projectId, DateTime occurredAt, double cost, int tokens = 100) => new()
    {
        RequestId = Guid.NewGuid().ToString(),
        ProjectId = projectId,
        OccurredAt = occurredAt,
        Model = "gemini-pro",
        CostUsd = cost,
        TotalTokens = tokens,
    };

    private static JobExecution Job(Guid projectId, DateTime startedAt, string status) => new()
    {
        JobId = Guid.NewGuid(),
        ProjectId = projectId,
        StartedAt = startedAt,
        Status = status,
        TemplateId = Guid.NewGuid(),
    };

    private static DateTime InRange => new(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc);
    private static DateTime OutOfRange => new(2026, 4, 1, 12, 0, 0, DateTimeKind.Utc);

    // ── tests ─────────────────────────────────────────────────────────────────

    [Test]
    public async Task ReturnsZeroSummaryWhenUserHasNoProjects()
    {
        SetupProjects();
        SetupSpendLogs();
        SetupJobExecutions();

        var result = await _handler.Handle(new GetGlobalSpendSummaryQuery(From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(0);
        result.CompletedJobCount.ShouldBe(0);
        result.FailedJobCount.ShouldBe(0);
        result.RequestCount.ShouldBe(0);
    }

    [Test]
    public async Task AggregatesCostAcrossUserProjects()
    {
        var projectA = Guid.NewGuid();
        var projectB = Guid.NewGuid();
        SetupProjects(OwnedProject(projectA), OwnedProject(projectB));
        SetupSpendLogs(
            SpendLog(projectA, InRange, 1.00),
            SpendLog(projectA, InRange, 0.50),
            SpendLog(projectB, InRange, 2.00));
        SetupJobExecutions();

        var result = await _handler.Handle(new GetGlobalSpendSummaryQuery(From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(3.50, tolerance: 0.001);
        result.RequestCount.ShouldBe(3);
    }

    [Test]
    public async Task ExcludesSpendLogsFromOtherUsersProjects()
    {
        var otherProject = Guid.NewGuid();
        SetupProjects(OwnedProject());
        SetupSpendLogs(
            SpendLog(ProjectId, InRange, 1.00),
            SpendLog(otherProject, InRange, 99.0));
        SetupJobExecutions();

        var result = await _handler.Handle(new GetGlobalSpendSummaryQuery(From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(1.00, tolerance: 0.001);
    }

    [Test]
    public async Task ExcludesSpendLogsOutsideDateRange()
    {
        SetupProjects(OwnedProject());
        SetupSpendLogs(
            SpendLog(ProjectId, InRange, 1.00),
            SpendLog(ProjectId, OutOfRange, 50.0));
        SetupJobExecutions();

        var result = await _handler.Handle(new GetGlobalSpendSummaryQuery(From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(1.00, tolerance: 0.001);
        result.RequestCount.ShouldBe(1);
    }

    [Test]
    public async Task CountsCompletedAndFailedJobsCorrectly()
    {
        SetupProjects(OwnedProject());
        SetupSpendLogs();
        SetupJobExecutions(
            Job(ProjectId, InRange, "COMPLETED"),
            Job(ProjectId, InRange, "COMPLETED"),
            Job(ProjectId, InRange, "FAILED"),
            Job(ProjectId, InRange, "RUNNING"));

        var result = await _handler.Handle(new GetGlobalSpendSummaryQuery(From, To), CancellationToken.None);

        result.CompletedJobCount.ShouldBe(2);
        result.FailedJobCount.ShouldBe(1);
    }

    [Test]
    public async Task ExcludesJobsOutsideDateRange()
    {
        SetupProjects(OwnedProject());
        SetupSpendLogs();
        SetupJobExecutions(
            Job(ProjectId, InRange, "COMPLETED"),
            Job(ProjectId, OutOfRange, "COMPLETED"));

        var result = await _handler.Handle(new GetGlobalSpendSummaryQuery(From, To), CancellationToken.None);

        result.CompletedJobCount.ShouldBe(1);
    }

    [Test]
    public async Task SumsTokensAcrossAllLogs()
    {
        SetupProjects(OwnedProject());
        SetupSpendLogs(
            SpendLog(ProjectId, InRange, 1.0, tokens: 300),
            SpendLog(ProjectId, InRange, 0.5, tokens: 200));
        SetupJobExecutions();

        var result = await _handler.Handle(new GetGlobalSpendSummaryQuery(From, To), CancellationToken.None);

        result.TotalTokens.ShouldBe(500);
    }
}
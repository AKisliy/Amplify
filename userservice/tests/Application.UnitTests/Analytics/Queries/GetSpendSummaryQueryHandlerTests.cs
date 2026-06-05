using UserService.Application.Analytics.Queries.GetSpendSummary;

namespace UserService.Application.UnitTests.Analytics.Queries;

[TestFixture]
public class GetSpendSummaryQueryHandlerTests
{
    private Mock<IApplicationDbContext> _db = null!;
    private GetSpendSummaryQueryHandler _handler = null!;

    private static readonly Guid ProjectId = Guid.NewGuid();

    private static readonly DateOnly From = new(2026, 5, 1);
    private static readonly DateOnly To   = new(2026, 5, 31);

    [SetUp]
    public void SetUp()
    {
        _db      = new Mock<IApplicationDbContext>();
        _handler = new GetSpendSummaryQueryHandler(_db.Object);
    }

    private void SetupSpendLogs(params GenerationSpendLog[] logs)
        => _db.Setup(d => d.GenerationSpendLogs).Returns(logs.AsQueryable().BuildMockDbSet().Object);

    private void SetupJobExecutions(params JobExecution[] jobs)
        => _db.Setup(d => d.JobExecutions).Returns(jobs.AsQueryable().BuildMockDbSet().Object);

    private static DateTime InRange => new(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc);

    private static GenerationSpendLog SpendLog(double cost, int tokens = 100) => new()
    {
        RequestId  = Guid.NewGuid().ToString(),
        ProjectId  = ProjectId,
        OccurredAt = InRange,
        Model      = "gemini-pro",
        CostUsd    = cost,
        TotalTokens = tokens,
    };

    private static JobExecution Job(string status) => new()
    {
        JobId = Guid.NewGuid(), ProjectId = ProjectId,
        StartedAt = InRange, Status = status, TemplateId = Guid.NewGuid(),
    };

    [Test]
    public async Task ReturnsZerosWhenNoData()
    {
        SetupSpendLogs();
        SetupJobExecutions();

        var result = await _handler.Handle(new GetSpendSummaryQuery(ProjectId, From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(0);
        result.TotalTokens.ShouldBe(0);
        result.RequestCount.ShouldBe(0);
        result.CompletedJobCount.ShouldBe(0);
        result.FailedJobCount.ShouldBe(0);
    }

    [Test]
    public async Task AggregatesSpendCorrectly()
    {
        SetupSpendLogs(SpendLog(1.50, tokens: 300), SpendLog(0.75, tokens: 150));
        SetupJobExecutions();

        var result = await _handler.Handle(new GetSpendSummaryQuery(ProjectId, From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(2.25, tolerance: 0.001);
        result.TotalTokens.ShouldBe(450);
        result.RequestCount.ShouldBe(2);
    }

    [Test]
    public async Task CountsJobStatusesCorrectly()
    {
        SetupSpendLogs();
        SetupJobExecutions(
            Job("COMPLETED"), Job("COMPLETED"),
            Job("FAILED"),
            Job("RUNNING"));

        var result = await _handler.Handle(new GetSpendSummaryQuery(ProjectId, From, To), CancellationToken.None);

        result.CompletedJobCount.ShouldBe(2);
        result.FailedJobCount.ShouldBe(1);
    }

    [Test]
    public async Task ExcludesLogsFromOtherProjects()
    {
        var otherProject = Guid.NewGuid();
        SetupSpendLogs(
            SpendLog(1.00),
            new GenerationSpendLog
            {
                RequestId = Guid.NewGuid().ToString(), ProjectId = otherProject,
                OccurredAt = InRange, Model = "gemini-pro", CostUsd = 99.0,
            });
        SetupJobExecutions();

        var result = await _handler.Handle(new GetSpendSummaryQuery(ProjectId, From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(1.00, tolerance: 0.001);
        result.RequestCount.ShouldBe(1);
    }

    [Test]
    public async Task ExcludesLogsOutsideDateRange()
    {
        SetupSpendLogs(
            SpendLog(1.00),
            new GenerationSpendLog
            {
                RequestId = Guid.NewGuid().ToString(), ProjectId = ProjectId,
                OccurredAt = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                Model = "gemini-pro", CostUsd = 50.0,
            });
        SetupJobExecutions();

        var result = await _handler.Handle(new GetSpendSummaryQuery(ProjectId, From, To), CancellationToken.None);

        result.TotalCostUsd.ShouldBe(1.00, tolerance: 0.001);
    }
}

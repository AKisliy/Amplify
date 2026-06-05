using UserService.Application.Analytics.Queries.Global;

namespace UserService.Application.UnitTests.Analytics.Queries;

[TestFixture]
public class GetGlobalCapitalBurnQueryHandlerTests
{
    private Mock<IApplicationDbContext> _db = null!;
    private Mock<IUser> _user = null!;
    private GetGlobalCapitalBurnQueryHandler _handler = null!;

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
        _handler = new GetGlobalCapitalBurnQueryHandler(_db.Object, _user.Object);
    }

    private void SetupProjects(params Project[] projects)
        => _db.Setup(d => d.Projects).Returns(projects.AsQueryable().BuildMockDbSet().Object);

    private void SetupSpendLogs(params GenerationSpendLog[] logs)
        => _db.Setup(d => d.GenerationSpendLogs).Returns(logs.AsQueryable().BuildMockDbSet().Object);

    private static Project OwnedProject(Guid? id = null) => new()
    {
        Id = id ?? ProjectId, Name = "P", UserId = UserId,
    };

    private static GenerationSpendLog SpendLog(Guid projectId, DateTime occurredAt, string model, double cost) => new()
    {
        RequestId  = Guid.NewGuid().ToString(),
        ProjectId  = projectId,
        OccurredAt = occurredAt,
        Model      = model,
        CostUsd    = cost,
    };

    private static DateTime Day(int day) => new(2026, 5, day, 12, 0, 0, DateTimeKind.Utc);

    [Test]
    public async Task ReturnsEmptyWhenUserHasNoProjects()
    {
        SetupProjects();
        SetupSpendLogs();

        var result = await _handler.Handle(new GetGlobalCapitalBurnQuery(From, To), CancellationToken.None);

        result.ShouldBeEmpty();
    }

    [Test]
    public async Task GroupsByDateAndModel()
    {
        SetupProjects(OwnedProject());
        SetupSpendLogs(
            SpendLog(ProjectId, Day(1), "veo-2",      1.00),
            SpendLog(ProjectId, Day(1), "veo-2",      0.50),
            SpendLog(ProjectId, Day(1), "elevenlabs",  0.20),
            SpendLog(ProjectId, Day(2), "veo-2",      2.00));

        var result = await _handler.Handle(new GetGlobalCapitalBurnQuery(From, To), CancellationToken.None);

        result.Count.ShouldBe(3); // (day1, veo-2), (day1, elevenlabs), (day2, veo-2)

        var day1Veo = result.Single(r => r.Date == new DateOnly(2026, 5, 1) && r.Model == "veo-2");
        day1Veo.CostUsd.ShouldBe(1.50, tolerance: 0.001);

        var day1Eleven = result.Single(r => r.Date == new DateOnly(2026, 5, 1) && r.Model == "elevenlabs");
        day1Eleven.CostUsd.ShouldBe(0.20, tolerance: 0.001);
    }

    [Test]
    public async Task ResultIsOrderedByDateAscending()
    {
        SetupProjects(OwnedProject());
        SetupSpendLogs(
            SpendLog(ProjectId, Day(10), "veo-2", 1.0),
            SpendLog(ProjectId, Day(3),  "veo-2", 1.0),
            SpendLog(ProjectId, Day(7),  "veo-2", 1.0));

        var result = await _handler.Handle(new GetGlobalCapitalBurnQuery(From, To), CancellationToken.None);

        result[0].Date.Day.ShouldBe(3);
        result[1].Date.Day.ShouldBe(7);
        result[2].Date.Day.ShouldBe(10);
    }

    [Test]
    public async Task ExcludesLogsFromOtherUsersProjects()
    {
        var otherProject = Guid.NewGuid();
        SetupProjects(OwnedProject());
        SetupSpendLogs(
            SpendLog(ProjectId,    Day(1), "veo-2", 1.00),
            SpendLog(otherProject, Day(1), "veo-2", 99.0));

        var result = await _handler.Handle(new GetGlobalCapitalBurnQuery(From, To), CancellationToken.None);

        result.Single().CostUsd.ShouldBe(1.00, tolerance: 0.001);
    }

    [Test]
    public async Task ExcludesLogsOutsideDateRange()
    {
        SetupProjects(OwnedProject());
        SetupSpendLogs(
            SpendLog(ProjectId, Day(15),                                         "veo-2", 1.00),
            SpendLog(ProjectId, new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc), "veo-2", 50.0));

        var result = await _handler.Handle(new GetGlobalCapitalBurnQuery(From, To), CancellationToken.None);

        result.Count.ShouldBe(1);
        result.Single().CostUsd.ShouldBe(1.00, tolerance: 0.001);
    }
}
using UserService.Application.ProjectAssets.Dto;
using UserService.Application.ProjectAssets.Queries.GetProjectAssets;
using UserService.Domain.Enums;

namespace UserService.Application.UnitTests.ProjectAssets.Queries;

[TestFixture]
public class GetProjectAssetsQueryHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IMapper> _mapper = null!;
    private GetProjectAssetsQueryHandler _handler = null!;

    private static readonly Guid ProjectId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _mapper = new Mock<IMapper>();
        _handler = new GetProjectAssetsQueryHandler(_dbContext.Object, _mapper.Object);

        _mapper
            .Setup(m => m.Map<IReadOnlyList<ProjectAssetDto>>(It.IsAny<IEnumerable<ProjectAsset>>()))
            .Returns((IEnumerable<ProjectAsset> src) => src
                .Select(a => new ProjectAssetDto
                {
                    MediaUrl = $"http://media/{a.MediaId}",
                    CreatedAt = a.Created
                })
                .ToList());
    }

    private void SetupDbSet(List<ProjectAsset> data)
    {
        var mockSet = data.AsQueryable().BuildMockDbSet();
        _dbContext.Setup(db => db.ProjectAssets).Returns(mockSet.Object);
    }

    private static ProjectAsset Asset(Guid projectId, DateTimeOffset created) => new()
    {
        Id = Guid.NewGuid(),
        MediaId = Guid.NewGuid(),
        ProjectId = projectId,
        Lifetime = AssetLifetime.Permanent,
        Created = created
    };

    [Test]
    public async Task ReturnsOnlyAssetsForRequestedProject()
    {
        var otherProjectId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var data = new List<ProjectAsset>
        {
            Asset(ProjectId, now),
            Asset(ProjectId, now.AddMinutes(-1)),
            Asset(otherProjectId, now.AddMinutes(-2)),
        };
        SetupDbSet(data);

        var result = await _handler.Handle(new GetProjectAssetsQuery(ProjectId, AssetLifetime.Permanent), CancellationToken.None);

        result.Items.Count.ShouldBe(2);
    }

    [Test]
    public async Task ReturnsItemsSortedByCreatedDescending()
    {
        var now = DateTimeOffset.UtcNow;
        var data = new List<ProjectAsset>
        {
            Asset(ProjectId, now.AddMinutes(-2)),
            Asset(ProjectId, now),
            Asset(ProjectId, now.AddMinutes(-1)),
        };
        SetupDbSet(data);

        var result = await _handler.Handle(new GetProjectAssetsQuery(ProjectId, AssetLifetime.Permanent), CancellationToken.None);

        result.Items[0].CreatedAt.ShouldBe(now);
        result.Items[1].CreatedAt.ShouldBe(now.AddMinutes(-1));
        result.Items[2].CreatedAt.ShouldBe(now.AddMinutes(-2));
    }

    [Test]
    public async Task ReturnsEmptyWhenNoAssetsExist()
    {
        SetupDbSet([]);

        var result = await _handler.Handle(new GetProjectAssetsQuery(ProjectId, AssetLifetime.Permanent), CancellationToken.None);

        result.Items.ShouldBeEmpty();
        result.NextCursor.ShouldBeNull();
    }

    [Test]
    public async Task NextCursorIsNullWhenAllItemsFitInOnePage()
    {
        var now = DateTimeOffset.UtcNow;
        var data = Enumerable.Range(0, 5)
            .Select(i => Asset(ProjectId, now.AddMinutes(-i)))
            .ToList();
        SetupDbSet(data);

        var result = await _handler.Handle(new GetProjectAssetsQuery(ProjectId, AssetLifetime.Permanent, PageSize: 10), CancellationToken.None);

        result.Items.Count.ShouldBe(5);
        result.NextCursor.ShouldBeNull();
    }

    [Test]
    public async Task NextCursorIsSetWhenThereAreMoreItems()
    {
        var now = DateTimeOffset.UtcNow;
        var data = Enumerable.Range(0, 11)
            .Select(i => Asset(ProjectId, now.AddMinutes(-i)))
            .ToList();
        SetupDbSet(data);

        var result = await _handler.Handle(new GetProjectAssetsQuery(ProjectId, AssetLifetime.Permanent, PageSize: 10), CancellationToken.None);

        result.Items.Count.ShouldBe(10);
        result.NextCursor.ShouldBe(now.AddMinutes(-9));
    }

    [Test]
    public async Task CursorFiltersOutOlderItems()
    {
        var now = DateTimeOffset.UtcNow;
        var cursor = now.AddMinutes(-5);
        var data = Enumerable.Range(0, 10)
            .Select(i => Asset(ProjectId, now.AddMinutes(-i)))
            .ToList();
        SetupDbSet(data);

        var result = await _handler.Handle(new GetProjectAssetsQuery(ProjectId, AssetLifetime.Permanent, Cursor: cursor), CancellationToken.None);

        result.Items.ShouldAllBe(item => item.CreatedAt < cursor);
    }

    [Test]
    public async Task PageSizeIsRespected()
    {
        var now = DateTimeOffset.UtcNow;
        var data = Enumerable.Range(0, 20)
            .Select(i => Asset(ProjectId, now.AddMinutes(-i)))
            .ToList();
        SetupDbSet(data);

        var result = await _handler.Handle(new GetProjectAssetsQuery(ProjectId, AssetLifetime.Permanent, PageSize: 5), CancellationToken.None);

        result.Items.Count.ShouldBe(5);
        result.NextCursor.ShouldNotBeNull();
    }
}

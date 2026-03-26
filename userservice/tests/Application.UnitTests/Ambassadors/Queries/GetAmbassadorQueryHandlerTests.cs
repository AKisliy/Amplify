using UserService.Application.Ambassadors.Queries.GetAmbassador;

namespace UserService.Application.UnitTests.Ambassadors.Queries;

[TestFixture]
public class GetAmbassadorQueryHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IMapper> _mapper = null!;
    private Mock<IUser> _user = null!;
    private GetAmbassadorQueryHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _mapper = new Mock<IMapper>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _handler = new GetAmbassadorQueryHandler(_dbContext.Object, _mapper.Object, _user.Object);
    }

    [Test]
    public async Task ReturnsMappedAmbassadorDto()
    {
        var ambassadorId = Guid.NewGuid();
        var ambassador = new Ambassador { Id = ambassadorId, Name = "Alice", CreatedBy = UserId };
        SetupAmbassadors([ambassador]);

        var dto = new AmbassadorDto { Id = ambassadorId, Name = "Alice" };
        _mapper.Setup(m => m.Map<AmbassadorDto>(ambassador)).Returns(dto);

        var result = await _handler.Handle(new GetAmbassadorQuery(ambassadorId), CancellationToken.None);

        result.ShouldBe(dto);
    }

    [Test]
    public async Task ThrowsNotFoundWhenAmbassadorDoesNotExist()
    {
        SetupAmbassadors([]);

        await Should.ThrowAsync<NotFoundException>(async () =>
            await _handler.Handle(new GetAmbassadorQuery(Guid.NewGuid()), CancellationToken.None));
    }

    [Test]
    public async Task ThrowsNotFoundWhenAmbassadorBelongsToAnotherUser()
    {
        var ambassadorId = Guid.NewGuid();
        // Ambassador exists but belongs to a different user — the Where filter will return empty
        var ambassador = new Ambassador { Id = ambassadorId, Name = "Bob", CreatedBy = Guid.NewGuid() };
        SetupAmbassadors([ambassador]);

        await Should.ThrowAsync<NotFoundException>(async () =>
            await _handler.Handle(new GetAmbassadorQuery(ambassadorId), CancellationToken.None));
    }

    private void SetupAmbassadors(List<Ambassador> ambassadors)
    {
        var mockSet = ambassadors.AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Ambassadors).Returns(mockSet.Object);
    }
}

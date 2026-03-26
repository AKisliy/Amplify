using UserService.Application.Ambassadors.Commands.DeleteAmbassador;

namespace UserService.Application.UnitTests.Ambassadors.Commands;

[TestFixture]
public class DeleteAmbassadorCommandHandlerTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private DeleteAmbassadorCommandHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);
        _dbContext.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _handler = new DeleteAmbassadorCommandHandler(_dbContext.Object, _user.Object);
    }

    [Test]
    public async Task RemovesAmbassadorAndSavesChanges()
    {
        var ambassadorId = Guid.NewGuid();
        var ambassador = new Ambassador { Id = ambassadorId, Name = "A", CreatedBy = UserId };
        SetupAmbassadors([ambassador]);

        await _handler.Handle(new DeleteAmbassadorCommand(ambassadorId), CancellationToken.None);

        var mockSet = new List<Ambassador> { ambassador }.AsQueryable().BuildMockDbSet();
        _dbContext.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ThrowsNotFoundWhenAmbassadorDoesNotExist()
    {
        SetupAmbassadors([]);

        await Should.ThrowAsync<NotFoundException>(async () =>
            await _handler.Handle(new DeleteAmbassadorCommand(Guid.NewGuid()), CancellationToken.None));
    }

    [Test]
    public async Task ThrowsUnauthorizedWhenUserIsNotCreator()
    {
        var ambassadorId = Guid.NewGuid();
        var ambassador = new Ambassador { Id = ambassadorId, Name = "A", CreatedBy = Guid.NewGuid() };
        SetupAmbassadors([ambassador]);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(new DeleteAmbassadorCommand(ambassadorId), CancellationToken.None));
    }

    private void SetupAmbassadors(List<Ambassador> ambassadors)
    {
        var mockSet = ambassadors.AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Ambassadors).Returns(mockSet.Object);
    }
}

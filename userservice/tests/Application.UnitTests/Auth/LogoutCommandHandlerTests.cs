using UserService.Application.Auth.Logout;

namespace UserService.Application.UnitTests.Auth;

[TestFixture]
public class LogoutCommandHandlerTests
{
    private Mock<IUser> _user = null!;
    private Mock<ITokenService> _tokenService = null!;
    private LogoutCommandHandler _handler = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _user = new Mock<IUser>();
        _tokenService = new Mock<ITokenService>();
        _handler = new LogoutCommandHandler(_user.Object, _tokenService.Object);
    }

    [Test]
    public async Task RevokesRefreshToken()
    {
        _user.SetupGet(u => u.Id).Returns(UserId);
        _tokenService.Setup(s => s.RevokeRefreshTokenAsync(UserId)).Returns(Task.CompletedTask);

        await _handler.Handle(new LogoutCommand(), CancellationToken.None);

        _tokenService.Verify(s => s.RevokeRefreshTokenAsync(UserId), Times.Once);
    }

    [Test]
    public void ThrowsWhenUserIdIsNull()
    {
        _user.SetupGet(u => u.Id).Returns((Guid?)null);

        Should.Throw<Exception>(() =>
            _handler.Handle(new LogoutCommand(), CancellationToken.None));
    }
}

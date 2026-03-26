using UserService.Application.Auth.Login;

namespace UserService.Application.UnitTests.Auth;

[TestFixture]
public class LoginUserCommandHandlerTests
{
    private Mock<IIdentityService> _identityService = null!;
    private Mock<ITokenService> _tokenService = null!;
    private LoginUserCommandHandler _handler = null!;

    [SetUp]
    public void SetUp()
    {
        _identityService = new Mock<IIdentityService>();
        _tokenService = new Mock<ITokenService>();
        _handler = new LoginUserCommandHandler(_identityService.Object, _tokenService.Object);
    }

    [Test]
    public async Task ReturnsAccessAndRefreshTokens()
    {
        var userId = Guid.NewGuid();
        var email = "user@test.com";
        IList<string> roles = ["User"];

        _identityService.Setup(s => s.AuthenticateAsync(email, "pass"))
            .ReturnsAsync((userId, email, roles));
        _tokenService.Setup(s => s.GenerateAccessTokenAsync(userId, email, roles))
            .ReturnsAsync("access-token");
        _tokenService.Setup(s => s.GenerateRefreshTokenAsync(userId))
            .ReturnsAsync("refresh-token");

        var result = await _handler.Handle(new LoginUserCommand(email, "pass"), CancellationToken.None);

        result.AccessToken.ShouldBe("access-token");
        result.RefreshToken.ShouldBe("refresh-token");
    }

    [Test]
    public async Task PropagatesUnauthorizedWhenCredentialsInvalid()
    {
        _identityService.Setup(s => s.AuthenticateAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(new LoginUserCommand("bad@test.com", "wrong"), CancellationToken.None));
    }
}

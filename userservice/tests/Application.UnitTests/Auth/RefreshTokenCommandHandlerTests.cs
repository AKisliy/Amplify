using System.Security.Claims;
using UserService.Application.Auth.Refresh;

namespace UserService.Application.UnitTests.Auth;

[TestFixture]
public class RefreshTokenCommandHandlerTests
{
    private Mock<ITokenService> _tokenService = null!;
    private RefreshTokenCommandHandler _handler = null!;

    [SetUp]
    public void SetUp()
    {
        _tokenService = new Mock<ITokenService>();
        _handler = new RefreshTokenCommandHandler(_tokenService.Object);
    }

    [Test]
    public async Task ReturnsNewTokensOnValidRefresh()
    {
        var userId = Guid.NewGuid();
        var email = "user@test.com";
        IList<string> roles = [];

        var principal = BuildPrincipal(userId);
        _tokenService.Setup(s => s.GetPrincipalFromExpiredToken("old-access"))
            .ReturnsAsync(principal);
        _tokenService.Setup(s => s.ValidateRefreshTokenAsync(userId, "old-refresh"))
            .ReturnsAsync((Result.Success(), userId, email, roles));
        _tokenService.Setup(s => s.GenerateAccessTokenAsync(userId, email, roles))
            .ReturnsAsync("new-access");
        _tokenService.Setup(s => s.GenerateRefreshTokenAsync(userId))
            .ReturnsAsync("new-refresh");

        var result = await _handler.Handle(
            new RefreshTokenCommand("old-access", "old-refresh"),
            CancellationToken.None);

        result.AccessToken.ShouldBe("new-access");
        result.RefreshToken.ShouldBe("new-refresh");
    }

    [Test]
    public async Task ThrowsWhenPrincipalHasNoUserIdClaim()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([]));
        _tokenService.Setup(s => s.GetPrincipalFromExpiredToken(It.IsAny<string>()))
            .ReturnsAsync(principal);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(
                new RefreshTokenCommand("bad-access", "any-refresh"),
                CancellationToken.None));
    }

    [Test]
    public async Task ThrowsWhenRefreshTokenIsInvalid()
    {
        var userId = Guid.NewGuid();
        var principal = BuildPrincipal(userId);
        _tokenService.Setup(s => s.GetPrincipalFromExpiredToken("access"))
            .ReturnsAsync(principal);
        _tokenService.Setup(s => s.ValidateRefreshTokenAsync(userId, "bad-refresh"))
            .ReturnsAsync((Result.Failure(["Invalid"]), userId, "", (IList<string>)[]));

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await _handler.Handle(
                new RefreshTokenCommand("access", "bad-refresh"),
                CancellationToken.None));
    }

    private static ClaimsPrincipal BuildPrincipal(Guid userId) =>
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())]));
}

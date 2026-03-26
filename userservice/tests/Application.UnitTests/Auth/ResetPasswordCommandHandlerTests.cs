using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using UserService.Application.Auth.Password;

namespace UserService.Application.UnitTests.Auth;

[TestFixture]
public class ResetPasswordCommandHandlerTests
{
    private Mock<IIdentityService> _identityService = null!;
    private ResetPasswordCommandHandler _handler = null!;

    [SetUp]
    public void SetUp()
    {
        _identityService = new Mock<IIdentityService>();
        _handler = new ResetPasswordCommandHandler(_identityService.Object);
    }

    [Test]
    public async Task CallsIdentityServiceWithDecodedToken()
    {
        const string rawCode = "original-reset-token";
        var encodedCode = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(rawCode));

        _identityService.Setup(s => s.ResetPasswordAsync("user@test.com", rawCode, "NewPass1!"))
            .Returns(Task.CompletedTask);

        await _handler.Handle(
            new ResetPasswordCommand("user@test.com", encodedCode, "NewPass1!"),
            CancellationToken.None);

        _identityService.Verify(
            s => s.ResetPasswordAsync("user@test.com", rawCode, "NewPass1!"),
            Times.Once);
    }
}

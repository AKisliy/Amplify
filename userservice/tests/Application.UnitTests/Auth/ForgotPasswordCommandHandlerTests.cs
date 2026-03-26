using Microsoft.Extensions.Options;
using UserService.Application.Auth.Password;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Options;

namespace UserService.Application.UnitTests.Auth;

[TestFixture]
public class ForgotPasswordCommandHandlerTests
{
    private Mock<ITokenService> _tokenService = null!;
    private Mock<IEmailService> _emailService = null!;
    private Mock<IOptions<FrontendOptions>> _frontendOptions = null!;
    private ForgotPasswordCommandHandler _handler = null!;

    [SetUp]
    public void SetUp()
    {
        _tokenService = new Mock<ITokenService>();
        _emailService = new Mock<IEmailService>();
        _frontendOptions = new Mock<IOptions<FrontendOptions>>();

        _frontendOptions.SetupGet(o => o.Value).Returns(new FrontendOptions
        {
            Url = "https://app.example.com",
            PasswordResetPath = "/reset-password",
            EmailConfirmedPath = "/confirmed",
            EmailConfirmationPath = "/confirm"
        });

        _handler = new ForgotPasswordCommandHandler(
            _tokenService.Object,
            _emailService.Object,
            _frontendOptions.Object);
    }

    [Test]
    public async Task SendsPasswordResetEmail()
    {
        _tokenService.Setup(s => s.GeneratePasswordResetTokenAsync("user@test.com"))
            .ReturnsAsync("reset-token");
        _emailService.Setup(s => s.SendPasswordResetLinkAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        await _handler.Handle(new ForgotPasswordCommand("user@test.com"), CancellationToken.None);

        _emailService.Verify(
            s => s.SendPasswordResetLinkAsync("user@test.com", It.IsAny<string>()),
            Times.Once);
    }

    [Test]
    public async Task DoesNothingWhenTokenIsNull()
    {
        _tokenService.Setup(s => s.GeneratePasswordResetTokenAsync(It.IsAny<string>()))
            .ReturnsAsync((string?)null);

        await _handler.Handle(new ForgotPasswordCommand("unknown@test.com"), CancellationToken.None);

        _emailService.Verify(
            s => s.SendPasswordResetLinkAsync(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }
}

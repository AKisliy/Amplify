using Microsoft.Extensions.Options;
using UserService.Application.Auth.Register;
using UserService.Application.Common.Options;

namespace UserService.Application.UnitTests.Auth;

[TestFixture]
public class RegisterUserCommandHandlerTests
{
    private Mock<IIdentityService> _identityService = null!;
    private Mock<ITokenService> _tokenService = null!;
    private Mock<IEmailService> _emailService = null!;
    private Mock<IOptions<FrontendOptions>> _frontendOptions = null!;
    private RegisterUserCommandHandler _handler = null!;

    [SetUp]
    public void SetUp()
    {
        _identityService = new Mock<IIdentityService>();
        _tokenService = new Mock<ITokenService>();
        _emailService = new Mock<IEmailService>();
        _frontendOptions = new Mock<IOptions<FrontendOptions>>();

        _frontendOptions.SetupGet(o => o.Value).Returns(new FrontendOptions
        {
            Url = "https://app.example.com",
            EmailConfirmationPath = "/confirm",
            EmailConfirmedPath = "/confirmed",
            PasswordResetPath = "/reset"
        });

        _handler = new RegisterUserCommandHandler(
            _tokenService.Object,
            _identityService.Object,
            _frontendOptions.Object,
            _emailService.Object);
    }

    [Test]
    public async Task ReturnsUserIdAndSendsConfirmationEmail()
    {
        var userId = Guid.NewGuid();
        _identityService.Setup(s => s.CreateUserAsync("user@test.com", "Pass123!"))
            .ReturnsAsync((Result.Success(), userId));
        _tokenService.Setup(s => s.GenerateEmailConfirmationTokenAsync(userId))
            .ReturnsAsync("raw-token");
        _emailService.Setup(s => s.SendConfirmationLinkAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var result = await _handler.Handle(
            new RegisterUserCommand("user@test.com", "Pass123!"),
            CancellationToken.None);

        result.ShouldBe(userId);
        _emailService.Verify(
            s => s.SendConfirmationLinkAsync("user@test.com", It.IsAny<string>()),
            Times.Once);
    }

    [Test]
    public async Task ThrowsWhenUserCreationFails()
    {
        _identityService.Setup(s => s.CreateUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Result.Failure(["Email already taken"]), Guid.Empty));

        await Should.ThrowAsync<Exception>(async () =>
            await _handler.Handle(
                new RegisterUserCommand("taken@test.com", "Pass123!"),
                CancellationToken.None));
    }
}

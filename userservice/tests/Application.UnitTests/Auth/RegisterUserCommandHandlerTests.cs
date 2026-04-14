using MediatR;
using UserService.Application.Auth.Register;
using UserService.Domain.Events.Auth;

namespace UserService.Application.UnitTests.Auth;

[TestFixture]
public class RegisterUserCommandHandlerTests
{
    private Mock<IIdentityService> _identityService = null!;
    private Mock<ITokenService> _tokenService = null!;
    private Mock<IMediator> _mediator = null!;
    private RegisterUserCommandHandler _handler = null!;

    [SetUp]
    public void SetUp()
    {
        _identityService = new Mock<IIdentityService>();
        _tokenService = new Mock<ITokenService>();
        _mediator = new Mock<IMediator>();

        _handler = new RegisterUserCommandHandler(
            _tokenService.Object,
            _identityService.Object,
            _mediator.Object);
    }

    [Test]
    public async Task ReturnsUserIdAndPublishesUserRegisteredEvent()
    {
        var userId = Guid.NewGuid();
        const string email = "user@test.com";
        const string rawToken = "raw-token";

        _identityService.Setup(s => s.CreateUserAsync(email, "Pass123!"))
            .ReturnsAsync((Result.Success(), userId));
        _tokenService.Setup(s => s.GenerateEmailConfirmationTokenAsync(userId))
            .ReturnsAsync(rawToken);
        _mediator.Setup(m => m.Publish(It.IsAny<INotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await _handler.Handle(
            new RegisterUserCommand(email, "Pass123!"),
            CancellationToken.None);

        result.ShouldBe(userId);

        _mediator.Verify(
            m => m.Publish(
                It.Is<UserRegisteredEvent>(e =>
                    e.UserId == userId &&
                    e.Email == email &&
                    e.RawConfirmationToken == rawToken),
                It.IsAny<CancellationToken>()),
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

    [Test]
    public async Task DoesNotPublishEventWhenUserCreationFails()
    {
        _identityService.Setup(s => s.CreateUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Result.Failure(["Email already taken"]), Guid.Empty));

        try
        {
            await _handler.Handle(
                new RegisterUserCommand("taken@test.com", "Pass123!"),
                CancellationToken.None);
        }
        catch { /* expected */ }

        _mediator.Verify(
            m => m.Publish(It.IsAny<INotification>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}

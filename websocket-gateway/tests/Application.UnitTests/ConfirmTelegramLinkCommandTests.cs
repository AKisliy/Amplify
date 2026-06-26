using Moq;
using NUnit.Framework;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.NotificationSettings.Commands.ConfirmTelegramLink;
using WebSocketGateway.Infrastructure.SignalR;

namespace WebSocketGateway.Application.UnitTests;

public class ConfirmTelegramLinkCommandTests
{
    private Mock<ITelegramLinkTokenCache> _telegramLinkTokenCache = null!;

    private ConfirmTelegramLinkCommandHandler _sut = null!;

    [SetUp]
    public void Setup()
    {
        _telegramLinkTokenCache = new Mock<ITelegramLinkTokenCache>();

        _sut = new ConfirmTelegramLinkCommandHandler(
            Mock.Of<IApplicationDbContext>(),
            _telegramLinkTokenCache.Object
        );
    }

    [Test]
    public void CannotConsumeToken_ReturnsFalse()
    {
        // Arrange
        _telegramLinkTokenCache
            .Setup(r => r.TryConsume(It.IsAny<string>(), out It.Ref<Guid>.IsAny))
            .Returns(false);
        
        // Act
    }
}

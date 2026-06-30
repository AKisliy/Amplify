using Microsoft.EntityFrameworkCore;
using Moq;
using Shouldly;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.NotificationSettings.Commands.ConfirmTelegramLink;
using Entities = WebSocketGateway.Domain.Entities;

namespace WebSocketGateway.Application.FunctionalTests;

using static Testing;

[TestFixture]
public class ConfirmTelegramLinkCommandTests : BaseTestFixture
{
    private Mock<ITelegramLinkTokenCache> _tokenCache = null!;
    private Mock<ITelegramNotifier> _telegram = null!;

    [SetUp]
    public void SetupTest()
    {
        _tokenCache = new Mock<ITelegramLinkTokenCache>();
        _telegram = new Mock<ITelegramNotifier>();
        _telegram
            .Setup(n => n.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    private ConfirmTelegramLinkCommandHandler BuildHandler()
    {
        return new ConfirmTelegramLinkCommandHandler(
            CreateDbContext(),
            _tokenCache.Object,
            _telegram.Object
        );
    }

    [Test]
    public async Task Handle_InvalidToken_ReturnsFalse()
    {
        var userId = Guid.Empty;
        _tokenCache.Setup(c => c.TryConsume(It.IsAny<string>(), out userId)).Returns(false);

        var result = await BuildHandler().Handle(
            new ConfirmTelegramLinkCommand("bad-token", 12345L, "alice"),
            CancellationToken.None
        );

        result.ShouldBeFalse();
        _telegram.Verify(
            n => n.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );

        await using var db = CreateDbContext();
        (await db.NotificationSettings.AnyAsync()).ShouldBeFalse();
    }

    [Test]
    public async Task Handle_ValidToken_NoExistingSettings_CreatesNewRow()
    {
        var userId = Guid.NewGuid();
        _tokenCache.Setup(c => c.TryConsume("tok", out userId)).Returns(true);

        var result = await BuildHandler().Handle(
            new ConfirmTelegramLinkCommand("tok", 42L, "@alice"),
            CancellationToken.None
        );

        result.ShouldBeTrue();
        _telegram.Verify(n => n.SendMessageAsync(42L, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);

        await using var db = CreateDbContext();
        var row = await db.NotificationSettings.SingleAsync(s => s.UserId == userId);
        row.TelegramChatId.ShouldBe(42L);
        row.TelegramUsername.ShouldBe("@alice");
    }

    [Test]
    public async Task Handle_ValidToken_ExistingSettings_UpdatesRow()
    {
        var userId = Guid.NewGuid();
        await AddAsync(new Entities.NotificationSettings { UserId = userId, TelegramChatId = 11L, TelegramUsername = "@old" });

        _tokenCache.Setup(c => c.TryConsume("tok", out userId)).Returns(true);

        var result = await BuildHandler().Handle(
            new ConfirmTelegramLinkCommand("tok", 99L, "@bob"),
            CancellationToken.None
        );

        result.ShouldBeTrue();
        _telegram.Verify(n => n.SendMessageAsync(99L, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);

        await using var db = CreateDbContext();
        var rows = await db.NotificationSettings.Where(s => s.UserId == userId).ToListAsync();
        rows.Count.ShouldBe(1);
        rows[0].TelegramChatId.ShouldBe(99L);
        rows[0].TelegramUsername.ShouldBe("@bob");
    }
}

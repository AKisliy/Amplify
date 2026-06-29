using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query;
using Moq;
using Shouldly;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.NotificationSettings.Commands.ConfirmTelegramLink;
using NotificationSettingsEntity = WebSocketGateway.Domain.Entities.NotificationSettings;

namespace WebSocketGateway.Application.UnitTests;

public class ConfirmTelegramLinkCommandTests
{
    private Mock<ITelegramLinkTokenCache> _telegramLinkTokenCache = null!;
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<ITelegramNotifier> _telegramNotifier = null!;

    private ConfirmTelegramLinkCommandHandler _sut = null!;

    [SetUp]
    public void Setup()
    {
        _telegramLinkTokenCache = new Mock<ITelegramLinkTokenCache>();
        _dbContext = new Mock<IApplicationDbContext>();
        _telegramNotifier = new Mock<ITelegramNotifier>();

        _sut = new ConfirmTelegramLinkCommandHandler(
            _dbContext.Object,
            _telegramLinkTokenCache.Object,
            _telegramNotifier.Object
        );
    }

    [Test]
    public async Task Handle_InvalidToken_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.Empty;
        _telegramLinkTokenCache
            .Setup(r => r.TryConsume(It.IsAny<string>(), out userId))
            .Returns(false);

        // Act
        var result = await _sut.Handle(
            new ConfirmTelegramLinkCommand("bad-token", 12345L, "alice"),
            CancellationToken.None
        );

        // Assert
        result.ShouldBeFalse();
        _dbContext.Verify(db => db.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _telegramNotifier.Verify(
            n => n.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Test]
    public async Task Handle_ValidToken_NoExistingSettings_CreatesNewAndReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var chatId = 42L;
        var username = "@alice";

        _telegramLinkTokenCache
            .Setup(r => r.TryConsume("valid-token", out userId))
            .Returns(true);

        var mockSet = CreateMockDbSet<NotificationSettingsEntity>([]);
        _dbContext.Setup(db => db.NotificationSettings).Returns(mockSet.Object);
        _dbContext.Setup(db => db.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _telegramNotifier
            .Setup(n => n.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.Handle(
            new ConfirmTelegramLinkCommand("valid-token", chatId, username),
            CancellationToken.None
        );

        // Assert
        result.ShouldBeTrue();
        mockSet.Verify(s => s.Add(It.Is<NotificationSettingsEntity>(ns =>
            ns.UserId == userId &&
            ns.TelegramChatId == chatId &&
            ns.TelegramUsername == username
        )), Times.Once);
        _telegramNotifier.Verify(
            n => n.SendMessageAsync(chatId, It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
        _dbContext.Verify(db => db.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Handle_ValidToken_ExistingSettings_UpdatesAndReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var chatId = 99L;
        var username = "@bob";

        _telegramLinkTokenCache
            .Setup(r => r.TryConsume("valid-token", out userId))
            .Returns(true);

        var existing = new NotificationSettingsEntity
        {
            UserId = userId,
            TelegramChatId = 11L,
            TelegramUsername = "@old"
        };
        var mockSet = CreateMockDbSet([existing]);
        _dbContext.Setup(db => db.NotificationSettings).Returns(mockSet.Object);
        _dbContext.Setup(db => db.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _telegramNotifier
            .Setup(n => n.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.Handle(
            new ConfirmTelegramLinkCommand("valid-token", chatId, username),
            CancellationToken.None
        );

        // Assert
        result.ShouldBeTrue();
        existing.TelegramChatId.ShouldBe(chatId);
        existing.TelegramUsername.ShouldBe(username);
        mockSet.Verify(s => s.Add(It.IsAny<NotificationSettingsEntity>()), Times.Never);
        _telegramNotifier.Verify(
            n => n.SendMessageAsync(chatId, It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
        _dbContext.Verify(db => db.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    private static Mock<DbSet<T>> CreateMockDbSet<T>(List<T> data) where T : class
    {
        var queryable = data.AsQueryable();
        var mockSet = new Mock<DbSet<T>>();

        mockSet.As<IAsyncEnumerable<T>>()
            .Setup(m => m.GetAsyncEnumerator(It.IsAny<CancellationToken>()))
            .Returns(new TestAsyncEnumerator<T>(data.GetEnumerator()));

        mockSet.As<IQueryable<T>>()
            .Setup(m => m.Provider)
            .Returns(new TestAsyncQueryProvider<T>(queryable.Provider));

        mockSet.As<IQueryable<T>>().Setup(m => m.Expression).Returns(queryable.Expression);
        mockSet.As<IQueryable<T>>().Setup(m => m.ElementType).Returns(queryable.ElementType);
        mockSet.As<IQueryable<T>>().Setup(m => m.GetEnumerator()).Returns(queryable.GetEnumerator());

        return mockSet;
    }
}

file class TestAsyncQueryProvider<TEntity>(IQueryProvider inner) : IAsyncQueryProvider
{
    public IQueryable CreateQuery(Expression expression) =>
        new TestAsyncEnumerable<TEntity>(expression);

    public IQueryable<TElement> CreateQuery<TElement>(Expression expression) =>
        new TestAsyncEnumerable<TElement>(expression);

    public object? Execute(Expression expression) => inner.Execute(expression);

    public TResult Execute<TResult>(Expression expression) => inner.Execute<TResult>(expression);

    public TResult ExecuteAsync<TResult>(Expression expression, CancellationToken cancellationToken = default)
    {
        var resultType = typeof(TResult).GetGenericArguments()[0];
        var result = inner.Execute(expression);
        return (TResult)typeof(Task)
            .GetMethod(nameof(Task.FromResult))!
            .MakeGenericMethod(resultType)
            .Invoke(null, [result])!;
    }
}

file class TestAsyncEnumerable<T>(Expression expression)
    : EnumerableQuery<T>(expression), IAsyncEnumerable<T>, IQueryable<T>
{
    IQueryProvider IQueryable.Provider => new TestAsyncQueryProvider<T>(this);

    public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default) =>
        new TestAsyncEnumerator<T>(this.AsEnumerable().GetEnumerator());
}

file class TestAsyncEnumerator<T>(IEnumerator<T> inner) : IAsyncEnumerator<T>
{
    public T Current => inner.Current;
    public ValueTask<bool> MoveNextAsync() => ValueTask.FromResult(inner.MoveNext());
    public ValueTask DisposeAsync() { inner.Dispose(); return ValueTask.CompletedTask; }
}

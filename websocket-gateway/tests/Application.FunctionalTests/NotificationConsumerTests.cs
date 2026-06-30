using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.State;
using WebSocketGateway.Contracts.Publisher;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Contracts.UserService;
using WebSocketGateway.Infrastructure.Broker.Consumers;
using Entities = WebSocketGateway.Domain.Entities;
using WebSocketGateway.Infrastructure.Data;
using WebSocketGateway.Infrastructure.SignalR;

namespace WebSocketGateway.Application.FunctionalTests;

using static Testing;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers shared across all test fixtures
// ──────────────────────────────────────────────────────────────────────────────
file static class Helpers
{
    public static ConsumeContext<T> MakeContext<T>(T message) where T : class
    {
        var mock = new Mock<ConsumeContext<T>>();
        mock.Setup(c => c.Message).Returns(message);
        mock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        return mock.Object;
    }

    public static IHubContext<MainHub, IClientReceiver> NoOpHub()
    {
        var receiver = new Mock<IClientReceiver>();
        receiver.Setup(r => r.OnNodeExecutionStatusChanged(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object?>(), It.IsAny<string?>())).Returns(Task.CompletedTask);
        receiver.Setup(r => r.OnAssetReady(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(Task.CompletedTask);
        receiver.Setup(r => r.OnPublicationStatusChanged(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>())).Returns(Task.CompletedTask);

        var clients = new Mock<IHubClients<IClientReceiver>>();
        clients.Setup(c => c.User(It.IsAny<string>())).Returns(receiver.Object);

        var hub = new Mock<IHubContext<MainHub, IClientReceiver>>();
        hub.Setup(h => h.Clients).Returns(clients.Object);
        return hub.Object;
    }

    public static Mock<IUserPresenceChecker> PresenceMock(Guid userId, bool isOnline)
    {
        var mock = new Mock<IUserPresenceChecker>();
        mock.Setup(p => p.IsOnline(userId)).Returns(isOnline);
        return mock;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 1: node error  (FAILURE → notifyOnError)
// ──────────────────────────────────────────────────────────────────────────────
[TestFixture]
public class NodeErrorTelegramTests : BaseTestFixture
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly string NodeId = Guid.NewGuid().ToString();
    private const string JobId = "job-error";

    private Mock<ITelegramNotifier> _telegram = null!;
    private ApplicationDbContext _db = null!;

    [SetUp]
    public async Task SetupTest()
    {
        _telegram = new Mock<ITelegramNotifier>();
        _telegram
            .Setup(t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _db = CreateDbContext();

        await AddAsync(new Entities.NotificationSettings
        {
            UserId = UserId,
            TelegramChatId = 42L,
            NotifyOnError = true,
        });
    }

    [TearDown]
    public async Task TearDownTest() => await _db.DisposeAsync();

    private NodeExecutionStatusChangedConsumer Build(bool notifyOnlyWhenOffline = false, bool userIsOnline = false)
    {
        if (notifyOnlyWhenOffline)
        {
            _db.NotificationSettings.First(s => s.UserId == UserId).NotifyOnlyWhenOffline = true;
            _db.SaveChanges();
        }

        return new NodeExecutionStatusChangedConsumer(
            Helpers.NoOpHub(),
            new NodeNotificationStateManager(NullLogger<NodeNotificationStateManager>.Instance),
            _db,
            _telegram.Object,
            Helpers.PresenceMock(UserId, userIsOnline).Object,
            NullLogger<NodeExecutionStatusChangedConsumer>.Instance
        );
    }

    [Test]
    public async Task SendsTelegram_OnFailure_WhenNotifyOnErrorEnabled()
    {
        var sut = Build();

        await sut.Consume(Helpers.MakeContext(new NodeExecutionStatusChanged
        {
            NodeId = NodeId,
            JobId = JobId,
            UserId = UserId.ToString(),
            PromptId = JobId,
            Status = "FAILURE",
            Error = "oops",
        }));

        _telegram.Verify(t => t.SendMessageAsync(42L, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task DoesNotSendTelegram_WhenUserIsOnline_AndNotifyOnlyWhenOfflineIsTrue()
    {
        var sut = Build(notifyOnlyWhenOffline: true, userIsOnline: true);

        await sut.Consume(Helpers.MakeContext(new NodeExecutionStatusChanged
        {
            NodeId = NodeId,
            JobId = JobId,
            UserId = UserId.ToString(),
            PromptId = JobId,
            Status = "FAILURE",
            Error = "oops",
        }));

        _telegram.Verify(
            t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 2: manual review  (WAITING_FOR_REVIEW → notifyOnHitl)
// ──────────────────────────────────────────────────────────────────────────────
[TestFixture]
public class NodeHitlTelegramTests : BaseTestFixture
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly string NodeId = Guid.NewGuid().ToString();
    private const string JobId = "job-hitl";

    private Mock<ITelegramNotifier> _telegram = null!;
    private ApplicationDbContext _db = null!;

    [SetUp]
    public async Task SetupTest()
    {
        _telegram = new Mock<ITelegramNotifier>();
        _telegram
            .Setup(t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _db = CreateDbContext();

        await AddAsync(new Entities.NotificationSettings
        {
            UserId = UserId,
            TelegramChatId = 99L,
            NotifyOnHitl = true,
        });
    }

    [TearDown]
    public async Task TearDownTest() => await _db.DisposeAsync();

    private NodeExecutionStatusChangedConsumer Build(bool notifyOnlyWhenOffline = false, bool userIsOnline = false)
    {
        if (notifyOnlyWhenOffline)
        {
            _db.NotificationSettings.First(s => s.UserId == UserId).NotifyOnlyWhenOffline = true;
            _db.SaveChanges();
        }

        return new NodeExecutionStatusChangedConsumer(
            Helpers.NoOpHub(),
            new NodeNotificationStateManager(NullLogger<NodeNotificationStateManager>.Instance),
            _db,
            _telegram.Object,
            Helpers.PresenceMock(UserId, userIsOnline).Object,
            NullLogger<NodeExecutionStatusChangedConsumer>.Instance
        );
    }

    [Test]
    public async Task SendsTelegram_OnWaitingForReview_WhenNotifyOnHitlEnabled()
    {
        var sut = Build();

        await sut.Consume(Helpers.MakeContext(new NodeExecutionStatusChanged
        {
            NodeId = NodeId,
            JobId = JobId,
            UserId = UserId.ToString(),
            PromptId = JobId,
            Status = "WAITING_FOR_REVIEW",
        }));

        _telegram.Verify(t => t.SendMessageAsync(99L, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task DoesNotSendTelegram_WhenUserIsOnline_AndNotifyOnlyWhenOfflineIsTrue()
    {
        var sut = Build(notifyOnlyWhenOffline: true, userIsOnline: true);

        await sut.Consume(Helpers.MakeContext(new NodeExecutionStatusChanged
        {
            NodeId = NodeId,
            JobId = JobId,
            UserId = UserId.ToString(),
            PromptId = JobId,
            Status = "WAITING_FOR_REVIEW",
        }));

        _telegram.Verify(
            t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 3: pipeline completes  (AssetRegistered → notifyOnCompletion)
// ──────────────────────────────────────────────────────────────────────────────
[TestFixture]
public class AssetReadyTelegramTests : BaseTestFixture
{
    private static readonly Guid UserId = Guid.NewGuid();
    private const string JobId = "job-asset";

    private Mock<ITelegramNotifier> _telegram = null!;
    private ApplicationDbContext _db = null!;

    [SetUp]
    public async Task SetupTest()
    {
        _telegram = new Mock<ITelegramNotifier>();
        _telegram
            .Setup(t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _db = CreateDbContext();

        await AddAsync(new Entities.NotificationSettings
        {
            UserId = UserId,
            TelegramChatId = 77L,
            NotifyOnCompletion = true,
        });
    }

    [TearDown]
    public async Task TearDownTest() => await _db.DisposeAsync();

    private AssetRegisteredConsumer Build(bool notifyOnlyWhenOffline = false, bool userIsOnline = false)
    {
        if (notifyOnlyWhenOffline)
        {
            _db.NotificationSettings.First(s => s.UserId == UserId).NotifyOnlyWhenOffline = true;
            _db.SaveChanges();
        }

        return new AssetRegisteredConsumer(
            Helpers.NoOpHub(),
            new JobNotificationStateManager(),
            _db,
            _telegram.Object,
            Helpers.PresenceMock(UserId, userIsOnline).Object,
            NullLogger<AssetRegisteredConsumer>.Instance
        );
    }

    [Test]
    public async Task SendsTelegram_OnAssetReady_WhenNotifyOnCompletionEnabled()
    {
        var sut = Build();

        await sut.Consume(Helpers.MakeContext(new AssetRegistered
        {
            Id = Guid.NewGuid().ToString(),
            JobId = JobId,
            UserId = UserId.ToString(),
            ProjectId = Guid.NewGuid().ToString(),
            MediaId = Guid.NewGuid().ToString(),
            MediaType = "video",
        }));

        _telegram.Verify(t => t.SendMessageAsync(77L, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task DoesNotSendTelegram_WhenUserIsOnline_AndNotifyOnlyWhenOfflineIsTrue()
    {
        var sut = Build(notifyOnlyWhenOffline: true, userIsOnline: true);

        await sut.Consume(Helpers.MakeContext(new AssetRegistered
        {
            Id = Guid.NewGuid().ToString(),
            JobId = JobId,
            UserId = UserId.ToString(),
            ProjectId = Guid.NewGuid().ToString(),
            MediaId = Guid.NewGuid().ToString(),
            MediaType = "video",
        }));

        _telegram.Verify(
            t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 4: publication finishes  (PublicationStatusChanged → notifyOnPublication)
// ──────────────────────────────────────────────────────────────────────────────
[TestFixture]
public class PublicationTelegramTests : BaseTestFixture
{
    private static readonly Guid UserId = Guid.NewGuid();

    private Mock<ITelegramNotifier> _telegram = null!;
    private ApplicationDbContext _db = null!;

    [SetUp]
    public async Task SetupTest()
    {
        _telegram = new Mock<ITelegramNotifier>();
        _telegram
            .Setup(t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _db = CreateDbContext();

        await AddAsync(new Entities.NotificationSettings
        {
            UserId = UserId,
            TelegramChatId = 55L,
            NotifyOnPublication = true,
        });
    }

    [TearDown]
    public async Task TearDownTest() => await _db.DisposeAsync();

    private PublicationStatusChangedConsumer Build(bool notifyOnlyWhenOffline = false, bool userIsOnline = false)
    {
        if (notifyOnlyWhenOffline)
        {
            _db.NotificationSettings.First(s => s.UserId == UserId).NotifyOnlyWhenOffline = true;
            _db.SaveChanges();
        }

        return new PublicationStatusChangedConsumer(
            Helpers.NoOpHub(),
            _db,
            _telegram.Object,
            Helpers.PresenceMock(UserId, userIsOnline).Object,
            NullLogger<PublicationStatusChangedConsumer>.Instance
        );
    }

    [Test]
    public async Task SendsTelegram_OnPublished_WhenNotifyOnPublicationEnabled()
    {
        var sut = Build();

        await sut.Consume(Helpers.MakeContext(new PublicationStatusChanged
        {
            UserId = UserId.ToString(),
            PublicationRecordId = Guid.NewGuid(),
            Status = "Published",
            PublicUrl = "https://example.com/post/1",
        }));

        _telegram.Verify(t => t.SendMessageAsync(55L, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task DoesNotSendTelegram_WhenUserIsOnline_AndNotifyOnlyWhenOfflineIsTrue()
    {
        var sut = Build(notifyOnlyWhenOffline: true, userIsOnline: true);

        await sut.Consume(Helpers.MakeContext(new PublicationStatusChanged
        {
            UserId = UserId.ToString(),
            PublicationRecordId = Guid.NewGuid(),
            Status = "Published",
            PublicUrl = "https://example.com/post/1",
        }));

        _telegram.Verify(
            t => t.SendMessageAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }
}

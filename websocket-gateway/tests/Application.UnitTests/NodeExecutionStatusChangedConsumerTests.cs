using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.State;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Infrastructure.Broker.Consumers;
using WebSocketGateway.Infrastructure.SignalR;

namespace WebSocketGateway.Application.UnitTests;

[TestFixture]
public class NodeExecutionStatusChangedConsumerTests
{
    private Mock<IHubContext<MainHub, IClientReceiver>> _hubContextMock = null!;
    private Mock<IClientReceiver> _clientReceiverMock = null!;
    private NodeNotificationStateManager _stateManager = null!;
    private NodeExecutionStatusChangedConsumer _sut = null!;

    private static readonly string ValidUserId = Guid.NewGuid().ToString();
    private static readonly string ValidNodeId = Guid.NewGuid().ToString();
    private const string JobId = "job-123";

    [SetUp]
    public void SetUp()
    {
        _clientReceiverMock = new Mock<IClientReceiver>();
        _clientReceiverMock
            .Setup(r => r.OnNodeExecutionStatusChanged(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        var hubClientsMock = new Mock<IHubClients<IClientReceiver>>();
        hubClientsMock
            .Setup(c => c.User(It.IsAny<string>()))
            .Returns(_clientReceiverMock.Object);

        _hubContextMock = new Mock<IHubContext<MainHub, IClientReceiver>>();
        _hubContextMock.Setup(h => h.Clients).Returns(hubClientsMock.Object);

        _stateManager = new NodeNotificationStateManager(NullLogger<NodeNotificationStateManager>.Instance);

        var dbMock = new Mock<IApplicationDbContext>();
        dbMock.Setup(d => d.NotificationSettings)
            .Returns(AsyncDbSetMock.Create<Domain.Entities.NotificationSettings>([]).Object);

        _sut = new NodeExecutionStatusChangedConsumer(
            _hubContextMock.Object,
            _stateManager,
            dbMock.Object,
            Mock.Of<ITelegramNotifier>(),
            Mock.Of<IUserPresenceChecker>(),
            NullLogger<NodeExecutionStatusChangedConsumer>.Instance);
    }

    // --- Helpers ---

    private Task Consume(string nodeId, string jobId, string userId, string status) =>
        _sut.Consume(MakeContext(new NodeExecutionStatusChanged
        {
            NodeId = nodeId,
            JobId = jobId,
            UserId = userId,
            PromptId = "prompt-1",
            Status = status,
        }));

    private static ConsumeContext<NodeExecutionStatusChanged> MakeContext(NodeExecutionStatusChanged message)
    {
        var mock = new Mock<ConsumeContext<NodeExecutionStatusChanged>>();
        mock.Setup(c => c.Message).Returns(message);
        mock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        return mock.Object;
    }

    private void VerifyForwarded(string nodeId, string status, Times times) =>
        _clientReceiverMock.Verify(
            r => r.OnNodeExecutionStatusChanged(nodeId, status, It.IsAny<object?>(), It.IsAny<string?>()),
            times);

    // --- Validation guards ---

    [Test]
    public async Task InvalidUserId_DoesNotForward()
    {
        await Consume(ValidNodeId, JobId, "not-a-guid", "RUNNING");

        _clientReceiverMock.Verify(
            r => r.OnNodeExecutionStatusChanged(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object?>(), It.IsAny<string?>()),
            Times.Never);
    }

    [Test]
    public async Task InvalidNodeId_DoesNotForward()
    {
        await Consume("not-a-guid", JobId, ValidUserId, "RUNNING");

        _clientReceiverMock.Verify(
            r => r.OnNodeExecutionStatusChanged(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object?>(), It.IsAny<string?>()),
            Times.Never);
    }

    // --- Normal flow ---

    [Test]
    public async Task Running_IsForwarded()
    {
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        VerifyForwarded(ValidNodeId, "RUNNING", Times.Once());
    }

    [Test]
    public async Task Success_IsForwarded()
    {
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        await Consume(ValidNodeId, JobId, ValidUserId, "SUCCESS");
        VerifyForwarded(ValidNodeId, "SUCCESS", Times.Once());
    }

    [Test]
    public async Task WaitingForReview_AfterRunning_IsForwarded()
    {
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        await Consume(ValidNodeId, JobId, ValidUserId, "WAITING_FOR_REVIEW");
        VerifyForwarded(ValidNodeId, "WAITING_FOR_REVIEW", Times.Once());
    }

    // --- Out-of-order / stale events ---

    [Test]
    public async Task Running_AfterSuccess_IsSuppressed()
    {
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        await Consume(ValidNodeId, JobId, ValidUserId, "SUCCESS");
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        VerifyForwarded(ValidNodeId, "RUNNING", Times.Once());
    }

    [Test]
    public async Task Running_AfterFailure_IsSuppressed()
    {
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        await Consume(ValidNodeId, JobId, ValidUserId, "FAILURE");
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        VerifyForwarded(ValidNodeId, "RUNNING", Times.Once());
    }

    [Test]
    public async Task Running_AfterWaitingForReview_IsSuppressed()
    {
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        await Consume(ValidNodeId, JobId, ValidUserId, "WAITING_FOR_REVIEW");
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        VerifyForwarded(ValidNodeId, "RUNNING", Times.Once());
    }

    [Test]
    public async Task WaitingForReview_AfterSuccess_IsSuppressed()
    {
        await Consume(ValidNodeId, JobId, ValidUserId, "RUNNING");
        await Consume(ValidNodeId, JobId, ValidUserId, "SUCCESS");
        await Consume(ValidNodeId, JobId, ValidUserId, "WAITING_FOR_REVIEW");
        VerifyForwarded(ValidNodeId, "WAITING_FOR_REVIEW", Times.Never());
    }

    // --- Isolation between (node, job) pairs ---

    [Test]
    public async Task DifferentJobs_DoNotInterfere()
    {
        var nodeId2 = Guid.NewGuid().ToString();

        await Consume(ValidNodeId, "job-A", ValidUserId, "RUNNING");
        await Consume(ValidNodeId, "job-A", ValidUserId, "SUCCESS");
        await Consume(nodeId2, "job-B", ValidUserId, "RUNNING");

        VerifyForwarded(nodeId2, "RUNNING", Times.Once());
    }

    [Test]
    public async Task SameNode_DifferentJobs_AreIsolated()
    {
        await Consume(ValidNodeId, "job-1", ValidUserId, "SUCCESS");
        await Consume(ValidNodeId, "job-2", ValidUserId, "RUNNING");
        VerifyForwarded(ValidNodeId, "RUNNING", Times.Once());
    }
}

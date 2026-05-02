using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using WebSocketGateway.Web.State;

namespace WebSocketGateway.Application.UnitTests;

[TestFixture]
public class NodeNotificationStateManagerTests
{
    private NodeNotificationStateManager _sut = null!;

    private const string NodeId = "node-1";
    private const string JobId = "job-1";

    [SetUp]
    public void SetUp()
    {
        _sut = new NodeNotificationStateManager(NullLogger<NodeNotificationStateManager>.Instance);
    }

    // --- First-time transitions ---

    [TestCase("RUNNING")]
    [TestCase("SUCCESS")]
    [TestCase("FAILURE")]
    [TestCase("WAITING_FOR_REVIEW")]
    public void FirstTransition_AlwaysAllowed(string status)
    {
        _sut.TryTransition(NodeId, JobId, status).ShouldBeTrue();
    }

    // --- Normal progressions ---

    [Test]
    public void Running_ThenSuccess_BothAllowed()
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING").ShouldBeTrue();
        _sut.TryTransition(NodeId, JobId, "SUCCESS").ShouldBeTrue();
    }

    [Test]
    public void Running_ThenFailure_BothAllowed()
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING").ShouldBeTrue();
        _sut.TryTransition(NodeId, JobId, "FAILURE").ShouldBeTrue();
    }

    [Test]
    public void Running_ThenWaitingForReview_BothAllowed()
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING").ShouldBeTrue();
        _sut.TryTransition(NodeId, JobId, "WAITING_FOR_REVIEW").ShouldBeTrue();
    }

    [Test]
    public void Running_ThenWaitingForReview_ThenSuccess_AllAllowed()
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING").ShouldBeTrue();
        _sut.TryTransition(NodeId, JobId, "WAITING_FOR_REVIEW").ShouldBeTrue();
        _sut.TryTransition(NodeId, JobId, "SUCCESS").ShouldBeTrue();
    }

    // --- Suppressed transitions: RUNNING after terminal ---

    [TestCase("SUCCESS")]
    [TestCase("FAILURE")]
    public void Running_AfterTerminal_IsSuppressed(string terminal)
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING");
        _sut.TryTransition(NodeId, JobId, terminal);

        _sut.TryTransition(NodeId, JobId, "RUNNING").ShouldBeFalse();
    }

    [TestCase("SUCCESS")]
    [TestCase("FAILURE")]
    public void WaitingForReview_AfterTerminal_IsSuppressed(string terminal)
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING");
        _sut.TryTransition(NodeId, JobId, terminal);

        _sut.TryTransition(NodeId, JobId, "WAITING_FOR_REVIEW").ShouldBeFalse();
    }

    [TestCase("SUCCESS")]
    [TestCase("FAILURE")]
    public void AnotherTerminal_AfterTerminal_IsSuppressed(string secondTerminal)
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING");
        _sut.TryTransition(NodeId, JobId, "SUCCESS");

        _sut.TryTransition(NodeId, JobId, secondTerminal).ShouldBeFalse();
    }

    // --- Suppressed: RUNNING after WAITING_FOR_REVIEW ---

    [Test]
    public void Running_AfterWaitingForReview_IsSuppressed()
    {
        _sut.TryTransition(NodeId, JobId, "RUNNING");
        _sut.TryTransition(NodeId, JobId, "WAITING_FOR_REVIEW");

        _sut.TryTransition(NodeId, JobId, "RUNNING").ShouldBeFalse();
    }

    // --- Isolation: different node+job pairs are independent ---

    [Test]
    public void DifferentJobIds_AreIsolated()
    {
        _sut.TryTransition(NodeId, "job-A", "RUNNING");
        _sut.TryTransition(NodeId, "job-A", "SUCCESS");

        // Same node, different job — must not be affected
        _sut.TryTransition(NodeId, "job-B", "RUNNING").ShouldBeTrue();
    }

    [Test]
    public void DifferentNodeIds_AreIsolated()
    {
        _sut.TryTransition("node-A", JobId, "RUNNING");
        _sut.TryTransition("node-A", JobId, "SUCCESS");

        // Same job, different node — must not be affected
        _sut.TryTransition("node-B", JobId, "RUNNING").ShouldBeTrue();
    }

    // --- Case insensitivity ---

    [TestCase("success")]
    [TestCase("Success")]
    [TestCase("SUCCESS")]
    public void TerminalStatus_IsCaseInsensitive(string terminal)
    {
        _sut.TryTransition(NodeId, JobId, terminal);

        _sut.TryTransition(NodeId, JobId, "RUNNING").ShouldBeFalse();
    }
}

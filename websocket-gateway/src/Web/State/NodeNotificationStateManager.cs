using System.Collections.Concurrent;

namespace WebSocketGateway.Web.State;

public enum NodeNotificationStatus
{
    Queued,
    Processing,
    Success,
    Failure
}

public class NodeNotificationState
{
    public NodeNotificationStatus Status { get; set; } = NodeNotificationStatus.Queued;
}

public class NodeNotificationStateManager
{
    private readonly ConcurrentDictionary<string, NodeNotificationState> _states = new();

    public NodeNotificationState GetOrCreate(string jobId) =>
        _states.GetOrAdd(jobId, _ => new NodeNotificationState());

    public void Remove(string jobId) => _states.TryRemove(jobId, out _);
}

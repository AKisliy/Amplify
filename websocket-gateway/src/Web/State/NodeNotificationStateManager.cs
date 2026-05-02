using System.Collections.Concurrent;

namespace WebSocketGateway.Web.State;

/// <summary>
/// In-memory state machine per (node_id, job_id) pair.
/// Prevents stale RUNNING/WAITING_FOR_REVIEW messages from overriding
/// terminal SUCCESS/FAILURE states due to out-of-order delivery.
///
/// Transition table:
/// | Incoming status     | Current state   | Action   |
/// |---------------------|-----------------|----------|
/// | any                 | (none)          | Forward  |
/// | RUNNING             | RUNNING         | Forward  |
/// | RUNNING             | SUCCESS/FAILURE  | Suppress |
/// | WAITING_FOR_REVIEW  | SUCCESS/FAILURE  | Suppress |
/// | SUCCESS/FAILURE     | any             | Forward  |
/// </summary>
public class NodeNotificationStateManager
{
    private static readonly HashSet<string> TerminalStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "SUCCESS", "FAILURE"
    };

    private readonly ConcurrentDictionary<string, string> _states = new();

    private static string MakeKey(string nodeId, string jobId) => $"{nodeId}:{jobId}";

    /// <summary>
    /// Attempts to transition the node state. Returns false if the transition
    /// is suppressed (e.g. RUNNING arriving after SUCCESS/FAILURE).
    /// </summary>
    public bool TryTransition(string nodeId, string jobId, string newStatus)
    {
        var key = MakeKey(nodeId, jobId);
        var suppressed = false;

        _states.AddOrUpdate(
            key,
            addValueFactory: _ => newStatus,
            updateValueFactory: (_, current) =>
            {
                if (TerminalStatuses.Contains(current))
                {
                    suppressed = true;
                    return current;
                }
                return newStatus;
            });

        return !suppressed;
    }

    public void Remove(string nodeId, string jobId) => _states.TryRemove(MakeKey(nodeId, jobId), out _);
}

using System.Collections.Concurrent;

namespace WebSocketGateway.Web.State;

public enum JobNotificationStatus { Idle, Loading, Done }

public class JobNotificationState
{
    public JobNotificationStatus Status { get; set; } = JobNotificationStatus.Idle;
}

/// <summary>
/// In-memory state machine per job_id.
/// Resolves the race between GraphCompleted (from template-service)
/// and AssetRegistered (from userservice).
///
/// Transition table:
/// | Event           | State   | Action                        | Next  |
/// |-----------------|---------|-------------------------------|-------|
/// | GraphCompleted  | Idle    | Send OnJobCompleted (loading) | Load  |
/// | GraphCompleted  | Done    | No-op (AssetRegistered won)   | Done  |
/// | AssetRegistered | Idle    | Send OnAssetReady immediately | Done  |
/// | AssetRegistered | Loading | Send OnAssetReady             | Done  |
/// | AssetRegistered | Done    | No-op (duplicate)             | Done  |
/// </summary>
public class JobNotificationStateManager
{
    private readonly ConcurrentDictionary<string, JobNotificationState> _states = new();

    public JobNotificationState GetOrCreate(string jobId) =>
        _states.GetOrAdd(jobId, _ => new JobNotificationState());

    public void Remove(string jobId) => _states.TryRemove(jobId, out _);
}

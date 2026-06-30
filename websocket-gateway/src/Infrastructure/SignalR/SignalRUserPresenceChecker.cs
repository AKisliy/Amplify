using System.Collections.Concurrent;
using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Infrastructure.SignalR;

/// <summary>
/// Checks whether a user has at least one active SignalR connection.
/// Uses the Hub's connection tracker which SignalR maintains internally.
/// </summary>
internal sealed class SignalRUserPresenceChecker(IUserConnectionTracker tracker) : IUserPresenceChecker
{
    public bool IsOnline(Guid userId) => tracker.IsConnected(userId);
}

/// <summary>
/// Thread-safe in-memory set of connected user ids, updated from MainHub lifecycle events.
/// </summary>
internal sealed class UserConnectionTracker : IUserConnectionTracker
{
    private readonly ConcurrentDictionary<Guid, int> _counts = new();

    public void OnConnected(Guid userId) => _counts.AddOrUpdate(userId, 1, (_, c) => c + 1);

    public void OnDisconnected(Guid userId) =>
        _counts.AddOrUpdate(userId, 0, (_, c) => Math.Max(0, c - 1));

    public bool IsConnected(Guid userId) => _counts.TryGetValue(userId, out var count) && count > 0;
}

public interface IUserConnectionTracker
{
    void OnConnected(Guid userId);
    void OnDisconnected(Guid userId);
    bool IsConnected(Guid userId);
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TypedSignalR.Client;

namespace WebSocketGateway.Infrastructure.SignalR;

[Hub]
public interface IMainHub;

[Authorize]
public class MainHub(IUserConnectionTracker tracker, ILogger<MainHub> logger) : Hub<IClientReceiver>
{
    public override Task OnConnectedAsync()
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            logger.LogWarning(
                "Cannot track user connection, UserIdentifier is not a valid GUID: {UserIdentifier}",
                Context.UserIdentifier
            );
            return base.OnConnectedAsync();
        }

        tracker.OnConnected(userId);
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            logger.LogWarning(
                "Cannot track user disconnection, UserIdentifier is not a valid GUID: {UserIdentifier}",
                Context.UserIdentifier
            );
            return base.OnDisconnectedAsync(exception);
        }

        tracker.OnDisconnected(userId);
        return base.OnDisconnectedAsync(exception);
    }
}

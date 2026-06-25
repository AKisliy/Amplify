namespace WebSocketGateway.Application.Common.Interfaces;

public interface IUserPresenceChecker
{
    bool IsOnline(Guid userId);
}

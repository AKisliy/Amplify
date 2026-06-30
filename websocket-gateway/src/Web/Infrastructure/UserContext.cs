using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Web.Infrastructure;

public class UserContext : IUser
{
    public Guid? Id { get; set; }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TypedSignalR.Client;
using WebSocketGateway.Web.Receivers;

namespace WebSocketGateway.Web.Hubs;

[Hub]
public interface IMainHub;

[Authorize]
public class MainHub : Hub<IClientReceiver>
{

}

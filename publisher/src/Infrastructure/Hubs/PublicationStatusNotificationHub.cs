using Microsoft.AspNetCore.SignalR;
using Publisher.Infrastructure.Receivers;

namespace Publisher.Infrastructure.Hubs;

[TypedSignalR.Client.Hub]
public interface IPublisherHub;

public class PublisherHub : Hub<IPublisherReceiver>, IPublisherHub;
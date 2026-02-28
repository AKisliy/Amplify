using Publisher.Application.AutoLists.Queries.GetAutoList;

namespace Publisher.Application.Connections.Queries.GetProjectConnections;

public class ConnectionsVm
{
    public IReadOnlyCollection<FullSocialAccountDto> Connections { get; set; } = [];
}
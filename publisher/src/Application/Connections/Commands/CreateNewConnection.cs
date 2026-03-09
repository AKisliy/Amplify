using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Newtonsoft.Json;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;

namespace Publisher.Application.Connections.Commands;

public record CreateNewConnection(string State, string Code) : IRequest<ConnectionResult>;

internal class CreateNewConnectionHandler(IConnectionServiceFactory integrationServiceFactory)
    : IRequestHandler<CreateNewConnection, ConnectionResult>
{
    public async Task<ConnectionResult> Handle(CreateNewConnection request, CancellationToken cancellationToken)
    {
        Guard.Against.NullOrEmpty(request.State);
        Guard.Against.NullOrEmpty(request.Code);

        var decodedState = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.State));
        var integrationState = JsonConvert.DeserializeObject<ConnectionState>(decodedState);

        Guard.Against.Null(integrationState);

        var integrationsService = integrationServiceFactory.GetConnectionService(integrationState.Provider);

        return await integrationsService.ConnectAccountAsync(request.Code, integrationState, cancellationToken);
    }
}
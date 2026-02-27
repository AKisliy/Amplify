using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Interfaces;

public interface IConnectionService
{
    SocialProvider SocialProvider { get; }

    Task<bool> ConnectAccountAsync(
        string code,
        ConnectionState state,
        CancellationToken cancellationToken = default);

    Task<AuthUrlResponse> GetAuthUrlAsync(Guid projectId, CancellationToken cancellationToken = default);
}

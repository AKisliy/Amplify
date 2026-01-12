using MassTransit;

namespace Publisher.Contracts.Events;

[MessageUrn("post-created")]
public record PostCreated
(
    Guid Id,
    string FileUrl,
    string CoverUrl,
    string Description,
    Guid PostContainerId
);


using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Models;

public record PublicationResult
(
    PublicationStatus Status,
    string PublicUrl
)
{
    public static PublicationResult Failed => new(PublicationStatus.Failed, string.Empty);
}

using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Models;

public record PublicationResult
(
    PublicationStatus Status,
    string? PublicUrl,
    string? ErrorMessage = null)
{
    public static PublicationResult Failed() => new(PublicationStatus.Failed, string.Empty);

    public static PublicationResult Failed(string errorMessage) => new(PublicationStatus.Failed, string.Empty, errorMessage);
}

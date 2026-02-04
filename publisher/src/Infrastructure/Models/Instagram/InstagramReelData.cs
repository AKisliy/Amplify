namespace Publisher.Infrastructure.Models.Instagram;

public record InstagramReelData(
    string PostUrl,
    string? Description,
    string? CoverUrl,
    bool ShareToFeed = false);


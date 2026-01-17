namespace MediaIngest.Application.Media.Queries.GetMedia;

public record MediaFileDto
{
    public Guid MediaId { get; set; }

    public required string MediaPath { get; set; }
}
namespace MediaIngest.Application.Media.Queries.GetLinkById;

public class GetLinkByIdResponse
{
    public Guid MediaId { get; init; }

    public required string Link { get; init; }
}

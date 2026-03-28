namespace MediaIngest.Application.Media.Queries.GetUploadPresignedUrl;

public class GetUploadPresignedUrlResponse
{
    public Guid MediaId { get; init; }
    public required string UploadUrl { get; init; }
}

namespace MediaIngest.Application.Media.Commands.CreateUploadPresignedUrl;

public class CreateUploadPresignedUrlDto
{
    public Guid MediaId { get; init; }
    public required string UploadUrl { get; init; }
}

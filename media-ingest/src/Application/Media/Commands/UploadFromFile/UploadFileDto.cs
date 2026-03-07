namespace MediaIngest.Application.Media.Commands.UploadFromFile;

public class UploadFileDto
{
    public Guid MediaId { get; set; }

    public required string MediaPath { get; set; }

    public required string ContentType { get; set; }
}

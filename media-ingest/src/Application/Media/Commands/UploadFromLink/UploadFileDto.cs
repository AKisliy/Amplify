using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Commands.Upload;

public record UploadFileDto(
    Guid UploadId
);


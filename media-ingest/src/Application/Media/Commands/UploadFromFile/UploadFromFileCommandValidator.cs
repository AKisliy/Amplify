using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Commands.UploadFromFile;

public class UploadFromFileCommandValidator : AbstractValidator<UploadFromFileCommand>
{
    private static readonly string[] AllowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxImageSize = 10 * 1024 * 1024;

    private static readonly string[] AllowedVideoTypes = ["video/mp4", "video/webm"];
    private const long MaxVideoSize = 100 * 1024 * 1024;

    public UploadFromFileCommandValidator()
    {
        When(x => x.FileType == FileType.Image, () =>
        {
            RuleFor(x => x.ContentType)
                .Must(ct => AllowedImageTypes.Contains(ct))
                .WithMessage("Only JPEG, PNG and WebP are allowed.");

            RuleFor(x => x.FileSize)
                .LessThanOrEqualTo(MaxImageSize)
                .WithMessage("File must not exceed 10 MB.");
        });

        When(x => x.FileType == FileType.Video, () =>
        {
            RuleFor(x => x.ContentType)
                .Must(ct => AllowedVideoTypes.Contains(ct))
                .WithMessage("Only MP4 and WebM are allowed.");

            RuleFor(x => x.FileSize)
                .LessThanOrEqualTo(MaxVideoSize)
                .WithMessage("File must not exceed 100 MB.");
        });
    }
}

using FluentValidation;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Commands.CreateUploadPresignedUrl;

public class CreateUploadPresignedUrlCommandValidator : AbstractValidator<CreateUploadPresignedUrlCommand>
{
    private string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];

    private const long MaxFileSize = 100 * 1024 * 1024;


    public CreateUploadPresignedUrlCommandValidator()
    {
        RuleFor(x => x.ContentType)
            .Must(ct => AllowedContentTypes.Contains(ct))
            .WithMessage("Only JPEG, PNG, WebP, MP4 and WebM are allowed.");

        RuleFor(x => x.FileSize)
            .LessThanOrEqualTo(MaxFileSize)
            .WithMessage("File must not exceed 100 MB.");

        RuleFor(x => x.Variant)
            .NotNull()
            .When(x => x.ParentMediaId != null);
    }
}

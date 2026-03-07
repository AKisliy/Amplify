namespace MediaIngest.Application.Media.Commands.UploadFromFile;

public class UploadFromFileCommandValidator : AbstractValidator<UploadFromFileCommand>
{
    private static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxSize = 10 * 1024 * 1024;

    public UploadFromFileCommandValidator()
    {
        RuleFor(x => x.ContentType)
            .Must(ct => AllowedTypes.Contains(ct))
            .WithMessage("Only JPEG, PNG and WebP are allowed.");

        RuleFor(x => x.FileSize)
            .LessThanOrEqualTo(MaxSize)
            .WithMessage("File must not exceed 10 MB.");
    }
}

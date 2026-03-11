namespace MediaIngest.Application.Media.Commands.ImportFromGoogleStorage;

internal class ImportFromGoogleStorageValidator : AbstractValidator<ImportFromGoogleStorageCommand>
{
    public ImportFromGoogleStorageValidator()
    {
        RuleFor(x => x.Files).NotEmpty();
        RuleForEach(x => x.Files).SetValidator(new ImportFromGoogleStorageDtoValidator());
    }
}

internal class ImportFromGoogleStorageDtoValidator : AbstractValidator<ImportFromGoogleStorageDto>
{
    private static readonly string[] AllowedContentTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm"];

    public ImportFromGoogleStorageDtoValidator()
    {
        RuleFor(x => x.GsUri)
            .NotEmpty()
            .Must(uri => uri.StartsWith("gs://"))
            .WithMessage("Invalid Google Storage URI.");

        RuleFor(x => x.ContentType)
            .Must(ct => AllowedContentTypes.Contains(ct))
            .WithMessage("Unsupported content type.");
    }
}

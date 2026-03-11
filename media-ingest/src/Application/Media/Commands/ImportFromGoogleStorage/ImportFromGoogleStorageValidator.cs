using Microsoft.Extensions.Options;

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

    private static readonly string[] AllowedFileExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "mp4",
        "webm"];


    public ImportFromGoogleStorageDtoValidator()
    {
        RuleFor(x => x.GsUri)
            .NotEmpty()
            .Must(uri => uri.StartsWith("gs://"))
            .WithMessage("Invalid Google Storage URI.");

        RuleFor(x => x.GsUri)
            .Must(uri =>
            {
                var parts = uri.Substring(5).Split('/', 2);
                return parts.Length == 2;
            })
            .WithMessage("URI must be in the format gs://{BucketName}/path/to/file and match the configured bucket.");

        RuleFor(x => x.GsUri)
            .Must(uri =>
            {
                var parts = uri.Substring(5).Split('/', 2);
                var bucketName = parts[0];
                var fileKey = parts[1];

                var extension = Path.GetExtension(fileKey).TrimStart('.').ToLower();
                return AllowedFileExtensions.Contains(extension);
            })
            .WithMessage("Unsupported file type. Allowed types: jpg, jpeg, png, webp, mp4, webm.");

        RuleFor(x => x.ContentType)
            .Must(ct => AllowedContentTypes.Contains(ct))
            .WithMessage("Unsupported content type.");
    }
}

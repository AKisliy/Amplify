using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace MediaIngest.Infrastructure.FileStorage;

public class GoogleStorageService(
    IOptions<S3Options> options,
    IApplicationDbContext dbContext) : IGoogleStorageService
{
    public async Task<Guid> SaveFileFromGsUriAsync(string gsUri, string contentType, CancellationToken cancellationToken)
    {
        var filePath = gsUri.Replace("gs://", string.Empty);

        var parts = filePath.Split('/', 2);
        if (parts.Length != 2)
            throw new ArgumentException("Invalid GsUri format. Expected format: gs://bucket_name/file_path", nameof(gsUri));

        var bucketName = parts[0];
        var fileKey = parts[1];

        if (string.IsNullOrEmpty(bucketName) || string.IsNullOrEmpty(fileKey))
            throw new ArgumentException("Invalid GsUri format. Bucket name and file path cannot be empty.", nameof(gsUri));

        if (bucketName != options.Value.BucketName)
            throw new ArgumentException($"Invalid bucket name. Expected: {options.Value.BucketName}", nameof(gsUri));

        var media = new MediaFile
        {
            FileKey = fileKey,
            ContentType = contentType,
        };

        dbContext.MediaFiles.Add(media);

        await dbContext.SaveChangesAsync(cancellationToken);

        return media.Id;
    }
}

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Publisher.Application.Common.Interfaces;
using Publisher.Infrastructure.Configuration.Options;

namespace Publisher.Infrastructure.Storage;

public class S3Storage(
    IOptions<S3Options> options,
    IMinioClient minio,
    ILogger<S3Storage> logger) : IFileStorage
{
    private readonly S3Options _options = options.Value;
    private readonly IMinioClient _minio = minio;
    private readonly ILogger _logger = logger;

    public Task<string> GetPresignedUrl(string fileKey)
    {
        var bucketName = _options.BucketName;
        _logger.LogDebug("Getting presigned url for file: {FilePath}, bucket: {BucketName}", fileKey, bucketName);

        return _minio.PresignedGetObjectAsync(new PresignedGetObjectArgs()
                .WithBucket(bucketName)
                .WithObject(fileKey)
                .WithExpiry(60 * 60 * 1)
        );
    }
}

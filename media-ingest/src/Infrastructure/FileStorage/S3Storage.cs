using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;

namespace MediaIngest.Infrastructure.FileStorage;

public class S3Storage(
    IMinioClient minio,
    IOptions<S3Options> options,
    ILogger<S3Storage> logger) : IFileStorage
{
    private readonly S3Options _options = options.Value;

    public async Task DeleteFileAsync(string fileKey, CancellationToken cancellationToken = default)
    {
        var removeObjectArgs = new RemoveObjectArgs()
            .WithBucket(_options.BucketName)
            .WithObject(fileKey);

        await minio.RemoveObjectAsync(removeObjectArgs, cancellationToken);
    }

    public async Task<string> GetPublicUrlAsync(string fileKey, TimeSpan validFor, CancellationToken cancellationToken = default)
    {
        var presignedGetObjectArgs = new PresignedGetObjectArgs()
            .WithBucket(_options.BucketName)
            .WithObject(fileKey)
            .WithExpiry((int)validFor.TotalSeconds);

        return await minio.PresignedGetObjectAsync(presignedGetObjectArgs);
    }

    public async Task<Stream> OpenFileAsync(string fileKey, CancellationToken cancellationToken = default)
    {
        var bucketName = _options.BucketName;

        var statArgs = new StatObjectArgs()
            .WithObject(fileKey)
            .WithBucket(bucketName);
        var stat = await minio.StatObjectAsync(statArgs, cancellationToken);

        var res = new ReleaseableFileStreamModel
        {
            ContentType = stat.ContentType,
            FileName = fileKey,
        };

        var getArgs = new GetObjectArgs()
            .WithObject(fileKey)
            .WithBucket(bucketName)
            .WithCallbackStream(res.SetStreamAsync);

        await res.HandleAsync(minio.GetObjectAsync(getArgs));

        return res.Stream;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileKey, CancellationToken cancellationToken = default)
    {
        var bucketName = _options.BucketName;
        var contentType = GetMimeTypeForKey(fileKey);
        try
        {
            var beArgs = new BucketExistsArgs()
                .WithBucket(bucketName);
            bool found = await minio.BucketExistsAsync(beArgs);
            if (!found)
            {
                var mbArgs = new MakeBucketArgs()
                    .WithBucket(bucketName);
                await minio.MakeBucketAsync(mbArgs);
            }
            var putObjectArgs = new PutObjectArgs()
                .WithBucket(bucketName)
                .WithObject(fileKey)
                .WithStreamData(fileStream)
                .WithObjectSize(-1)
                .WithContentType(contentType);
            await minio.PutObjectAsync(putObjectArgs, cancellationToken);
            logger.LogDebug("File was saved to S3 with key: {FileKey}", fileKey);

            return fileKey;
        }
        catch (MinioException e)
        {
            logger.LogError("Error occured while saving file ({FileKey}) to S3: {ErrorMessage}", fileKey, e.Message);
            throw;
        }
    }

    public async Task<string> SaveFileAsync(byte[] fileContent, string fileKey, CancellationToken cancellationToken = default)
    {
        var bucketName = _options.BucketName;
        var contentType = GetMimeTypeForKey(fileKey);
        try
        {
            var beArgs = new BucketExistsArgs()
                .WithBucket(bucketName);
            bool found = await minio.BucketExistsAsync(beArgs);
            if (!found)
            {
                var mbArgs = new MakeBucketArgs()
                    .WithBucket(bucketName);
                await minio.MakeBucketAsync(mbArgs);
            }
            var putObjectArgs = new PutObjectArgs()
                .WithBucket(bucketName)
                .WithObject(fileKey)
                .WithStreamData(new MemoryStream(fileContent))
                .WithContentType(contentType);
            await minio.PutObjectAsync(putObjectArgs, cancellationToken);
            logger.LogDebug("File was saved to S3 with key: {FileKey}", fileKey);

            return fileKey;
        }
        catch (MinioException e)
        {
            logger.LogError("Error occured while saving file ({FileKey}) to S3: {ErrorMessage}", fileKey, e.Message);
            throw;
        }
    }

    private string GetMimeTypeForKey(string fileKey)
    {
        return MimeTypes.GetMimeType(fileKey);
    }
}
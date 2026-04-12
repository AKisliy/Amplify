using Flurl;
using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
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

    public async Task<string> GetPresignedUrlAsync(MediaFile mediaFile, TimeSpan validFor, CancellationToken cancellationToken = default, bool includeMetadata = true)
    {
        var expiry = validFor.TotalSeconds;
        var args = new PresignedGetObjectArgs()
            .WithBucket(_options.BucketName)
            .WithObject(mediaFile.FileKey)
            .WithExpiry((int)expiry);

        if (includeMetadata)
        {
            args = args.WithHeaders(new Dictionary<string, string>
            {
                { "Content-Disposition", $"inline; filename=\"{mediaFile.OriginalFileName}\"" },
                { "Content-Type", mediaFile.ContentType ?? "application/octet-stream" }
            });
        }

        return await minio.PresignedGetObjectAsync(args);
    }

    public async Task<string> GetPresignedUrlAsync(string fileKey, TimeSpan validFor, CancellationToken cancellationToken = default)
    {
        var args = new PresignedGetObjectArgs()
            .WithBucket(_options.BucketName)
            .WithObject(fileKey)
            .WithExpiry((int)validFor.TotalSeconds);

        return await minio.PresignedGetObjectAsync(args);
    }

    public async Task<string> GetPresignedUploadUrlAsync(string fileKey, string contentType, TimeSpan validFor, CancellationToken cancellationToken = default)
    {
        var args = new PresignedPutObjectArgs()
            .WithBucket(_options.BucketName)
            .WithObject(fileKey)
            .WithExpiry((int)validFor.TotalSeconds)
            .WithHeaders(new Dictionary<string, string>
            {
                { "Content-Type", contentType ?? "application/octet-stream" }
            });

        return await minio.PresignedPutObjectAsync(args);
    }

    public Task<string> GetPublicUrlAsync(MediaFile mediaFile, CancellationToken cancellationToken = default)
    {
        var publicUrl = new Url(_options.PublicBucketUrl).AppendPathSegment(mediaFile.FileKey).ToString();
        return Task.FromResult(publicUrl);
    }

    public async Task<bool> FileExistsAsync(string fileKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var args = new StatObjectArgs()
                .WithBucket(_options.BucketName)
                .WithObject(fileKey);
            var stat = await minio.StatObjectAsync(args, cancellationToken);
            return true;
        }
        catch (ObjectNotFoundException)
        {
            return false;
        }
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
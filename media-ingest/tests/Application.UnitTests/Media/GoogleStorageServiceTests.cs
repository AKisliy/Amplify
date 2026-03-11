using MediaIngest.Infrastructure.Configuration;
using MediaIngest.Infrastructure.Data;
using MediaIngest.Infrastructure.FileStorage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using Shouldly;

namespace MediaIngest.Application.UnitTests.Media;

public class GoogleStorageServiceTests
{
    private ApplicationDbContext _dbContext = null!;
    private GoogleStorageService _sut = null!;

    private const string BucketName = "test-bucket";

    [SetUp]
    public void SetUp()
    {
        var dbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _dbContext = new ApplicationDbContext(dbOptions);

        var s3Options = Options.Create(new S3Options { BucketName = BucketName });
        _sut = new GoogleStorageService(s3Options, _dbContext);
    }

    [TearDown]
    public void TearDown() => _dbContext.Dispose();

    [Test]
    public async Task SaveFileFromGsUriAsync_ValidUri_ReturnsNewMediaId()
    {
        var gsUri = $"gs://{BucketName}/videos/test.mp4";

        var mediaId = await _sut.SaveFileFromGsUriAsync(gsUri, "video/mp4", CancellationToken.None);

        mediaId.ShouldNotBe(Guid.Empty);
    }

    [Test]
    public async Task SaveFileFromGsUriAsync_ValidUri_SavesMediaFileWithCorrectFields()
    {
        var gsUri = $"gs://{BucketName}/videos/test.mp4";
        var contentType = "video/mp4";

        var mediaId = await _sut.SaveFileFromGsUriAsync(gsUri, contentType, CancellationToken.None);

        var saved = await _dbContext.MediaFiles.FindAsync(mediaId);
        saved.ShouldNotBeNull();
        saved.FileKey.ShouldBe("videos/test.mp4");
        saved.ContentType.ShouldBe(contentType);
    }

    [Test]
    public async Task SaveFileFromGsUriAsync_UriWithoutSeparator_ThrowsArgumentException()
    {
        var gsUri = $"gs://{BucketName}";

        var ex = await Should.ThrowAsync<ArgumentException>(
            () => _sut.SaveFileFromGsUriAsync(gsUri, "video/mp4", CancellationToken.None));

        ex.ParamName.ShouldBe("gsUri");
    }

    [Test]
    public async Task SaveFileFromGsUriAsync_EmptyBucketName_ThrowsArgumentException()
    {
        var gsUri = "gs:///videos/test.mp4";

        var ex = await Should.ThrowAsync<ArgumentException>(
            () => _sut.SaveFileFromGsUriAsync(gsUri, "video/mp4", CancellationToken.None));

        ex.ParamName.ShouldBe("gsUri");
    }

    [Test]
    public async Task SaveFileFromGsUriAsync_EmptyFileKey_ThrowsArgumentException()
    {
        var gsUri = $"gs://{BucketName}/";

        var ex = await Should.ThrowAsync<ArgumentException>(
            () => _sut.SaveFileFromGsUriAsync(gsUri, "video/mp4", CancellationToken.None));

        ex.ParamName.ShouldBe("gsUri");
    }

    [Test]
    public async Task SaveFileFromGsUriAsync_WrongBucketName_ThrowsArgumentException()
    {
        var gsUri = "gs://other-bucket/videos/test.mp4";

        var ex = await Should.ThrowAsync<ArgumentException>(
            () => _sut.SaveFileFromGsUriAsync(gsUri, "video/mp4", CancellationToken.None));

        ex.ParamName.ShouldBe("gsUri");
    }
}

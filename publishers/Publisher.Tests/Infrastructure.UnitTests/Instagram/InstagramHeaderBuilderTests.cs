using FluentAssertions;
using Publisher.Infrastructure.Instagram;
using static Publisher.Core.Constants.InstagramApi;

namespace Publisher.Tests.Infrastructure.UnitTests.Instagram;

public class InstagramHeaderBuilderTests
{
    [Fact]
    public void AddResumableUploadHeaders_Success_AddsAuthHeader()
    {
        // Arrange
        var fakeFileSize = 1;
        var mockAccessToken = "token";
        var headerBuilder = new InstagramHeaderBuilder();
        var mockRequestMessage = new HttpRequestMessage();

        // Act
        headerBuilder.AddResumableUploadHeaders(mockRequestMessage, mockAccessToken, fakeFileSize);

        // Assert
        mockRequestMessage.Headers.TryGetValues(HeaderFieldName.Authorization, out var headerValues);

        headerValues.Should().NotBeNull();
        headerValues.Should().ContainSingle(x => x == $"OAuth {mockAccessToken}");
    }

    [Fact]
    public void AddResumableUploadHeaders_Success_AddsFileOffsetHeader()
    {
        // Arrange
        var fakeFileSize = 1;
        var fakeAccessToken = "token";
        var mockFileOffset = 1;
        var headerBuilder = new InstagramHeaderBuilder();
        var mockRequestMessage = new HttpRequestMessage();

        // Act
        headerBuilder.AddResumableUploadHeaders(mockRequestMessage, fakeAccessToken, fakeFileSize, mockFileOffset);

        // Assert
        mockRequestMessage.Headers.TryGetValues(HeaderFieldName.UploadFileOffset, out var headerValues);

        headerValues.Should().ContainSingle(x => x == mockFileOffset.ToString());
    }

    [Fact]
    public void AddResumableUploadHeaders_Success_AddsFileSizeHeader()
    {
        // Arrange
        var mockFileSize = 1;
        var fakeAccessToken = "token";
        var headerBuilder = new InstagramHeaderBuilder();
        var mockRequestMessage = new HttpRequestMessage();

        // Act
        headerBuilder.AddResumableUploadHeaders(mockRequestMessage, fakeAccessToken, mockFileSize);

        // Assert
        mockRequestMessage.Headers.TryGetValues(HeaderFieldName.UploadFileSize, out var headerValues);

        headerValues.Should().ContainSingle(x => x == mockFileSize.ToString());
    }
}

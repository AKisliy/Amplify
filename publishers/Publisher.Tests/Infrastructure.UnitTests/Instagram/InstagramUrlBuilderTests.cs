using FluentAssertions;
using Microsoft.Extensions.Options;
using Publisher.Infrastructure.Configuration;
using Publisher.Infrastructure.Instagram;
using static Publisher.Core.Constants.InstagramApi;

namespace Publisher.Tests.Infrastructure.UnitTests.Instagram;

public class InstagramUrlBuilderTests
{
    [Fact]
    public void GetMediaCreationUrl_CorrectUserId_ReturnsCorrectUrl()
    {
        // Arrange
        var mockBaseGraphHost = "mock.com";
        var mockApiVersion = "v1.0";
        var mockUserId = "11";

        var expectedUrl = $"{mockBaseGraphHost}/{mockApiVersion}/{mockUserId}/media";
        var options = Options.Create(
            new InstagramApiOptions
            {
                BaseGraphHostUrl = mockBaseGraphHost,
                ApiVersion = mockApiVersion
            });
        var urlBuilder = new InstagramUrlBuilder(options);

        // Act
        var url = urlBuilder.GetMediaCreationUrl(mockUserId);

        // Assert
        url.Should().Be(expectedUrl);
    }

    [Fact]
    public void GetMediaResumableUploadUrl_CorrectCreationId_ReturnsCorrectUrl()
    {
        // Arrange
        var mockResumableUploadHost = "resumable.com";
        var mockApiVersion = "v1.0";
        var mockCreationId = "11";

        var expectedUrl = $"{mockResumableUploadHost}/ig-api-upload/{mockApiVersion}/{mockCreationId}";
        var options = Options.Create<InstagramApiOptions>(
            new InstagramApiOptions
            {
                ResumableUploadHostUrl = mockResumableUploadHost,
                ApiVersion = mockApiVersion
            });
        var urlBuilder = new InstagramUrlBuilder(options);

        // Act
        var url = urlBuilder.GetMediaResumableUploadUrl(mockCreationId);

        // Assert
        url.Should().Be(expectedUrl);
    }

    [Fact]
    public void GetStatusUrl_CorrectInput_ReturnsCorrectUrl()
    {
        // Arrange
        var mockCreationId = "creation";
        var mockAccessToken = "access_token";
        var mockBaseGraphHost = "graph.com";
        var mockApiVersion = "v1.0";

        var expectedUrl =
            $"{mockBaseGraphHost}/{mockApiVersion}/{mockCreationId}?fields={PayloadFieldName.StatusCode}&access_token={mockAccessToken}";
        var options = Options.Create<InstagramApiOptions>(
            new InstagramApiOptions
            {
                BaseGraphHostUrl = mockBaseGraphHost,
                ApiVersion = mockApiVersion
            });
        var urlBuilder = new InstagramUrlBuilder(options);

        // Act
        var result = urlBuilder.GetStatusUrl(mockCreationId, mockAccessToken);

        // Assert
        result.Should().Be(expectedUrl);
    }

    [Fact]
    public void GetPublishUrl_ValidInput_ReturnCorrectUrl()
    {
        // Arrange
        var mockCreationId = "creation";
        var mockBaseGraphHost = "graph.com";
        var mockApiVersion = "v1.0";

        var expectedUrl =
            $"{mockBaseGraphHost}/{mockApiVersion}/{mockCreationId}/media_publish";
        var options = Options.Create<InstagramApiOptions>(
            new InstagramApiOptions
            {
                BaseGraphHostUrl = mockBaseGraphHost,
                ApiVersion = mockApiVersion
            });
        var urlBuilder = new InstagramUrlBuilder(options);

        // Act
        var result = urlBuilder.GetPublishUrl(mockCreationId);

        // Assert
        result.Should().Be(expectedUrl);
    }

    [Fact]
    public void GetUrlForShortcode_ValidInput_ReturnsCorrectUrl()
    {
        // Arrange
        var mockCreationId = "creation";
        var mockAccessToken = "token";
        var mockBaseGraphHost = "graph.com";
        var mockApiVersion = "v1.0";

        var expectedUrl =
            $"{mockBaseGraphHost}/{mockApiVersion}/{mockCreationId}?fields={PayloadFieldName.ShortCode}&access_token={mockAccessToken}";
        var options = Options.Create<InstagramApiOptions>(
            new InstagramApiOptions
            {
                BaseGraphHostUrl = mockBaseGraphHost,
                ApiVersion = mockApiVersion
            });
        var urlBuilder = new InstagramUrlBuilder(options);

        // Act
        var result = urlBuilder.GetUrlForShortcode(mockCreationId, mockAccessToken);

        // Assert
        result.Should().Be(expectedUrl);
    }

    [Fact]
    public void FormPostLink_CorrectShortCode_ReturnsInstagramPostLink()
    {
        // Arrange
        var mockShortCode = "sh";
        var options = Options.Create<InstagramApiOptions>(new());
        var urlBuilder = new InstagramUrlBuilder(options);
        var expectedUrl = $"https://instagram.com/p/{mockShortCode}";

        // Act
        var url = urlBuilder.FormPostLink(mockShortCode);

        // Assert
        url.Should().Be(expectedUrl);
    }
}

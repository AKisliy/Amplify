using System.Web;
using FluentAssertions;
using Publisher.Application.Common.Models.Instagram;
using Publisher.Infrastructure.Instagram;
using static Publisher.Core.Constants.InstagramApi;

namespace Publisher.Tests.Infrastructure.UnitTests.Instagram;

public class InstagramPayloadBuilderTests
{
    [Fact]
    public async Task BuildReelCreationPayload_Success_ReturnsPayloadWithAllNeccessaryFields()
    {
        // Arrange
        var instagramPayloadBuilder = new InstagramPayloadBuilder();
        var fakeVideoPath = "/reelpath";
        var fakeUserId = "id";
        var mockAccessToken = "token2";

        InstagramReelData fakeReelData = new(fakeVideoPath, null, null);
        InstagramCredentials mockCredentials = new(fakeUserId, mockAccessToken);

        // Act
        var content = instagramPayloadBuilder.BuildReelCreationPayload(fakeReelData, mockCredentials);

        // Assert
        content.Should().BeOfType<FormUrlEncodedContent>();

        var contentString = await content.ReadAsStringAsync();
        var payload = HttpUtility.ParseQueryString(contentString);

        payload[PayloadFieldName.MediaType].Should().Be(MediaType.Reels);
        payload[PayloadFieldName.AccessToken].Should().Be(mockAccessToken);
        payload[PayloadFieldName.UploadType].Should().Be(UploadType.Resumable);
        payload[PayloadFieldName.DisableLikesAndViewsCounts].Should().Be(fakeReelData.ShareToFeed.ToString().ToLower());

        payload[PayloadFieldName.CoverUrl].Should().BeNull();
        payload[PayloadFieldName.Caption].Should().BeNull();
    }

    [Fact]
    public async Task BuildReelCreationPayload_CalledWithDescription_AddCaptionToPayload()
    {
        // Arrange
        var instagramPayloadBuilder = new InstagramPayloadBuilder();
        var fakeVideoPath = "/reelpath";
        var fakeUserId = "id";
        var fakeAccessToken = "token2";
        var mockDescription = "mock description";

        InstagramReelData fakeReelData = new(fakeVideoPath, mockDescription, null);
        InstagramCredentials fakeCredentials = new(fakeUserId, fakeAccessToken);

        // Act
        var content = instagramPayloadBuilder.BuildReelCreationPayload(fakeReelData, fakeCredentials);

        // Assert
        var contentString = await content.ReadAsStringAsync();
        var payload = HttpUtility.ParseQueryString(contentString);

        payload[PayloadFieldName.Caption].Should().Be(mockDescription);
    }

    [Fact]
    public async Task BuildReelCreationPayload_CalledWithCoverUrl_AddCoverUrlToPayload()
    {
        // Arrange
        var instagramPayloadBuilder = new InstagramPayloadBuilder();
        var fakeVideoPath = "/reelpath";
        var fakeUserId = "id";
        var fakeAccessToken = "token2";
        var mockCover = "mock cover";

        InstagramReelData fakeReelData = new(fakeVideoPath, null, mockCover);
        InstagramCredentials fakeCredentials = new(fakeUserId, fakeAccessToken);

        // Act
        var content = instagramPayloadBuilder.BuildReelCreationPayload(fakeReelData, fakeCredentials);

        // Assert
        var contentString = await content.ReadAsStringAsync();
        var payload = HttpUtility.ParseQueryString(contentString);

        payload[PayloadFieldName.CoverUrl].Should().Be(mockCover);
    }

    [Fact]
    public async Task BuildReelCreationPayload_Success_AddDisableLikesAndViewsCounts()
    {
        // Arrange
        var instagramPayloadBuilder = new InstagramPayloadBuilder();
        var fakeVideoPath = "/reelpath";
        var fakeUserId = "id";
        var fakeAccessToken = "token2";
        var fakeDisableLikesAndViewsCounts = true;
        var mockDisableLikesAndViewsCountsString = fakeDisableLikesAndViewsCounts.ToString().ToLower();

        InstagramReelData fakeReelData = new(fakeVideoPath, null, null, fakeDisableLikesAndViewsCounts);
        InstagramCredentials fakeCredentials = new(fakeUserId, fakeAccessToken);

        // Act
        var content = instagramPayloadBuilder.BuildReelCreationPayload(fakeReelData, fakeCredentials);

        // Assert
        var contentString = await content.ReadAsStringAsync();
        var payload = HttpUtility.ParseQueryString(contentString);

        payload[PayloadFieldName.DisableLikesAndViewsCounts].Should().Be(mockDisableLikesAndViewsCountsString);
    }
}

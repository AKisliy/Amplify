

using MediaIngest.Domain.Enums;
using MediaIngest.Infrastructure.Configuration;
using MediaIngest.Infrastructure.MediaLinkResolvers;
using Microsoft.Extensions.Options;
using Shouldly;

namespace MediaIngest.Infrastructure.IntegrationTests;

public class InstagramLinkResolverTests
{
    [Fact]
    public async Task GetDirectDownloadLink_VideoContent_ReturnsCorrectLink()
    {
        // Arrange
        const string instVideo = "https://www.instagram.com/p/DNwDQ_62FRS/";
        const MediaType contentType = MediaType.Video;
        const string expectedVideoUrl = "https://scontent-fra5-1.cdninstagram.com/o1/v/t2/f2/m367/AQNWFrQ5GWPeFH3T2Ep6fHUL_-CDRmulT6VFur-hJpt8ep3--fisZ8xaQDZEiDALXaVeUZ2W_tWXTMkSY5eP-_b6KBO96-qWJJjHfDXopdO4Ww.mp4";

        var optionsData = new YtDlpOptions
        {
            YoutubeDLPath = "/opt/homebrew/bin/yt-dlp",
            InstagramCookiesPath = "/Users/alexeykiselev/dev/AIMachine/src/video-editors/cookies.txt"
        };

        var options = Options.Create<YtDlpOptions>(optionsData);

        var instagramLinkResolver = new InstagramLinkResolver(options);

        // Act
        var resolvedUrl = await instagramLinkResolver.GetDirectDownloadLink(instVideo, contentType);

        // Arrange
        var questionMarkIdx = resolvedUrl.IndexOf("?");
        resolvedUrl.Substring(0, questionMarkIdx).ShouldBe(expectedVideoUrl);
    }

    [Fact]
    public async Task GetDirectDownloadLink_AudioContent_ReturnsCorrectLink()
    {
        // Arrange
        const string instVideo = "https://www.instagram.com/p/DNwDQ_62FRS/";
        const MediaType contentType = MediaType.Audio;
        const string expectedAudioUrl = "https://scontent-fra3-1.cdninstagram.com/o1/v/t16/f2/m69/AQPYDte5Tjh8hyVNn7iCyYK0e3bjeZYJPKPspt2uhrKOO9fosk5s24_pU2WLN5oy5EBEn6fJGBhf4-Jop7Xjbo-m.mp4";

        var optionsData = new YtDlpOptions
        {
            YoutubeDLPath = "/opt/homebrew/bin/yt-dlp",
            InstagramCookiesPath = "/Users/alexeykiselev/dev/AIMachine/src/video-editors/cookies.txt"
        };
        var options = Options.Create<YtDlpOptions>(optionsData);
        var instagramLinkResolver = new InstagramLinkResolver(options);


        // Act
        var resolvedUrl = await instagramLinkResolver.GetDirectDownloadLink(instVideo, contentType);

        // Arrange
        var questionMarkIdx = resolvedUrl.IndexOf("?");
        resolvedUrl.Substring(0, questionMarkIdx).ShouldBe(expectedAudioUrl);
    }

    [Fact]
    public async Task GetDirectDownloadLink_VideoAudioContent_ReturnsCorrectLink()
    {
        // Arrange
        const string instVideo = "https://www.instagram.com/p/DNwDQ_62FRS/";
        const MediaType contentType = MediaType.VideoAudio;
        var expectedVideoWithAudioUrl = "https://scontent-fra3-1.cdninstagram.com/o1/v/t2/f2/m86/AQPFHdlryhzoeV1873NvWhpVmEvJfW81YpxcgzomzTj-egE1sQ_LNyKyu42Dpq_j5YZ-2WefLnoLgfolH8n-iKNiUaIwRpzFhEfqWCc.mp4";

        var optionsData = new YtDlpOptions
        {
            YoutubeDLPath = "/opt/homebrew/bin/yt-dlp",
            InstagramCookiesPath = "/Users/alexeykiselev/dev/AIMachine/src/video-editors/cookies.txt"
        };
        var options = Options.Create<YtDlpOptions>(optionsData);
        var instagramLinkResolver = new InstagramLinkResolver(options);


        // Act
        var resolvedUrl = await instagramLinkResolver.GetDirectDownloadLink(instVideo, contentType);

        // Arrange
        var questionMarkIdx = resolvedUrl.IndexOf("?");
        resolvedUrl.Substring(0, questionMarkIdx).ShouldBe(expectedVideoWithAudioUrl);
    }
}

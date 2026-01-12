using System.Text.RegularExpressions;
using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Infrastructure.MediaLinkResolvers;

public class PinterestLinkResolver(
    HttpClient httpClient,
    ILogger<PinterestLinkResolver> logger) : IMediaLinkResolver
{
    private readonly Regex _pinterestLinkPattern = new(@"^https:\/\/(www\.)?pin\.it\/[a-zA-Z0-9]+$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex _regex = new(@"<video[^>]+poster=""https:\/\/i\.pinimg\.com\/\d+x\/[\w\/]+\.jpg""[^>]+src=""([^""]+)""");

    private static readonly string[] possibleUrlsTemplates =
        {
            "https://v1.pinimg.com/videos/iht/expMp4/{0}_720w.mp4",
            "https://v1.pinimg.com/videos/mc/720p/{0}.mp4",
            "https://v1.pinimg.com/videos/iht/expMp4/{0}_t4.mp4"
        };

    public bool CanHandle(string link)
    {
        return _pinterestLinkPattern.IsMatch(link);
    }

    public async Task<string> GetDirectDownloadLink(string videoLink, MediaType mediaType)
    {
        var mp4Url = await GetMp4UrlFromPin(videoLink);
        if (mp4Url is null)
            throw new NotFoundException(videoLink, "Mp4 url");
        logger.LogDebug("Found pinterest MP4 download link {Mp4Url}", mp4Url);
        return mp4Url;
    }

    public async Task<string?> GetMp4UrlFromPin(string pinUrl)
    {
        // 1. Получаем HTML страницы
        var html = await httpClient.GetStringAsync(pinUrl);
        // Находим m3u8 ссылку
        var match = _regex.Match(html);

        if (match.Success)
        {
            string videoSrc = match.Groups[1].Value;
            logger.LogDebug("Found video src: {VideoSrc}", videoSrc);
        }
        else
        {
            logger.LogDebug("Couldn't found videosrc for {PinUrl}", pinUrl);
        }

        string posterUrl = match.Groups[1].Value;
        string partialPath = ExtractPartialPath(posterUrl);
        if (string.IsNullOrEmpty(partialPath))
        {
            logger.LogDebug("Couldn't extract identifier from URL: {PosterUrl}", posterUrl);
            return null;
        }

        foreach (var urlTemplate in possibleUrlsTemplates)
        {
            var url = string.Format(urlTemplate, partialPath);
            var response = await httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Head, url));
            if (response.IsSuccessStatusCode)
                return url;
        }


        return null;
    }

    private static string ExtractPartialPath(string posterUrl)
    {
        var match = Regex.Match(posterUrl, @"/hls/([\w/]+)\.m3u8");
        return match.Success ? match.Groups[1].Value : "";
    }
}

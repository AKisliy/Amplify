using System.Text.RegularExpressions;
using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;
using MediaIngest.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using YoutubeDLSharp;
using YoutubeDLSharp.Options;

namespace MediaIngest.Infrastructure.MediaLinkResolvers;

public class InstagramLinkResolver(
    IOptions<YtDlpOptions> configOptions
) : IMediaLinkResolver
{
    private readonly Regex _instagramRegex = new(@"^https?://(www\.)?instagram\.com/(reel|p)/[^/?#]+/?", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public bool CanHandle(string link)
    {
        return _instagramRegex.IsMatch(link);
    }

    public async Task<string> GetDirectDownloadLink(string contentLink, MediaType mediaType)
    {
        var options = new OptionSet()
        {
            Quiet = true,
            SkipDownload = true,
            Cookies = configOptions.Value.InstagramCookiesPath
        };

        options.Format = MediaTypeFormat.FormatForMediaType[mediaType];

        var ytdl = new YoutubeDL();
        ytdl.YoutubeDLPath = configOptions.Value.YoutubeDLPath;

        var res = await ytdl.RunVideoDataFetch(contentLink, overrideOptions: options);

        return res.Data.Url;
    }
}
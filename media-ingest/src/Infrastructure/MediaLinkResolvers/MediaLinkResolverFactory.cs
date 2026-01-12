using MediaIngest.Application.Common.Interfaces;

namespace MediaIngest.Infrastructure.MediaLinkResolvers;

public class MediaLinkResolverFactory(IEnumerable<IMediaLinkResolver> mediaDownloaders) : IMediaLinkResolverFactory
{
    public IMediaLinkResolver GetMediaLinkResolverForLink(string link)
    {
        return mediaDownloaders.FirstOrDefault(d => d.CanHandle(link))
            ?? throw new NotSupportedException("Неизвестный формат ссылки.");
    }
}
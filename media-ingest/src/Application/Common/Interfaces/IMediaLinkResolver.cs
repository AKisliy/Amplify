using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Common.Interfaces;

public interface IMediaLinkResolver
{
    bool CanHandle(string link);
    Task<string> GetDirectDownloadLink(string contentLink, MediaType mediaType);
}

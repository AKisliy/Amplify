namespace MediaIngest.Application.Common.Interfaces;

public interface IMediaLinkResolverFactory
{
    IMediaLinkResolver GetMediaLinkResolverForLink(string link);
}

using MediaIngest.Domain.Enums;

namespace MediaIngest.Infrastructure.MediaLinkResolvers;

public static class MediaTypeFormat
{
    public static readonly IReadOnlyDictionary<MediaType, string> FormatForMediaType = new Dictionary<MediaType, string>
    {
       { MediaType.Audio , "bestaudio/best" },
       { MediaType.Video, "bestvideo/best" },
       { MediaType.VideoAudio, "best" }
    };
}

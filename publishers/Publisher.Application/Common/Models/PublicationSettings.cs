using Publisher.Core.Entities;

namespace Publisher.Application.Common.Models;

public class PublicationSettings
{
    public InstagramPublishingPreset InstagramSettings { get; set; } = null!;

    public static PublicationSettings Default => new PublicationSettings
    {
        InstagramSettings = new InstagramPublishingPreset
        {
            ShareToFeed = false
        }
    };
}

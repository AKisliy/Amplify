using Publisher.Domain.Entities;

namespace Publisher.Application.Common.Models.Dto;

public class InstagramPublishingPresetDto
{
    public bool ShareToFeed { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<InstagramPublishingPresetDto, InstagramPublishingPreset>();

            CreateMap<InstagramPublishingPreset, InstagramPublishingPresetDto>();
        }
    }
}

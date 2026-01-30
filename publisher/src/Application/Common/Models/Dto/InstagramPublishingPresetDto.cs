using Publisher.Domain.Entities;
using Publisher.Domain.Entities.PublicationSetup;

namespace Publisher.Application.Common.Models.Dto;

public class InstagramSettingsDto
{
    public bool ShareToFeed { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<InstagramSettingsDto, InstagramSettings>().ReverseMap();
        }
    }
}

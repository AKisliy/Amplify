using Publisher.Core.Entities;

namespace Publisher.Application.Common.Models.Dto;

public record SocialMediaAccountDto
{
    public Guid Id { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<SocialMediaAccountDto, SocialMediaAccount>();
        }
    }
}

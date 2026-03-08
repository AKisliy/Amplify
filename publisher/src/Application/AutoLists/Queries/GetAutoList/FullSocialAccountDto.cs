using Publisher.Application.Common.Mappings;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Application.AutoLists.Queries.GetAutoList;

public class FullSocialAccountDto
{
    public Guid Id { get; set; }

    public SocialProvider SocialProvider { get; set; }

    public string Username { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<SocialAccount, FullSocialAccountDto>()
                .ForMember(d => d.SocialProvider, o => o.MapFrom(s => s.Provider))
                .ForMember(d => d.AvatarUrl, o => o.MapFrom<ImageUrlResolver, Guid?>(s => s.AvatarMediaId));
        }
    }
}

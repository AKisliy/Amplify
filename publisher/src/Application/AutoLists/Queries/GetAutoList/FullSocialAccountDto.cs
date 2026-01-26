using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Application.AutoLists.Queries.GetAutoList;

public class FullSocialAccountDto
{
    public Guid Id { get; set; }

    public SocialProvider SocialProvider { get; set; }

    public string Username { get; set; } = null!;

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<SocialAccount, FullSocialAccountDto>();
        }
    }
}

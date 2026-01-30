using Publisher.Application.AutoLists.Commands.CreateAutoList;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;

namespace Publisher.Application.AutoLists.Queries.GetAutoList;

public class FullAutoListDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public InstagramSettingsDto? InstagramSettings { get; set; }

    public ICollection<AutoListEntryDto> Entries { get; set; } = [];

    public ICollection<FullSocialAccountDto> Accounts { get; set; } = [];

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<AutoList, FullAutoListDto>()
                .ForMember(
                    dest => dest.InstagramSettings,
                    opt => opt.MapFrom(src => src.PublicationSettings.Instagram));
        }
    }
}

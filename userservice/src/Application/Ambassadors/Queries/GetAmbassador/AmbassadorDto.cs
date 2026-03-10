using UserService.Application.Common.Mappings;
using UserService.Domain.Entities;

namespace UserService.Application.Ambassadors.Queries.GetAmbassador;

public class AmbassadorDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Biography { get; set; }

    public string? BehavioralPatterns { get; set; }

    public string? ProfileImageUrl { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<Ambassador, AmbassadorDto>()
                .ForMember(
                    dest => dest.ProfileImageUrl,
                    opt => opt.MapFrom<ImageUrlResolver, Guid?>(src => src.ProfileImageId));
        }
    }
}

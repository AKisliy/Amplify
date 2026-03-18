using UserService.Application.Common.Mappings;
using UserService.Domain.Entities;

namespace UserService.Application.ProjectAssets.Dto;

public class ProjectAssetDto
{
    public required string MediaUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<ProjectAsset, ProjectAssetDto>()
                .ForMember(dest => dest.MediaUrl, opt => opt.MapFrom<ImageUrlResolver, Guid>(src => src.MediaId))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.Created));
        }
    }
}

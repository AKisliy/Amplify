using UserService.Application.Common.Mappings;
using UserService.Domain.Entities;
using UserService.Domain.Enums;

namespace UserService.Application.ProjectAssets.Dto;

public class ProjectAssetDto
{
    public Guid Id { get; set; }

    public Guid MediaId { get; set; }

    public AssetMediaType MediaType { get; set; }

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

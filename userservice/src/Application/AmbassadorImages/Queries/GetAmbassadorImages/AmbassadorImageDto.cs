using UserService.Application.Common.Mappings;
using UserService.Domain.Entities;
using UserService.Domain.Enums;

namespace UserService.Application.AmbassadorImages.Queries.GetAmbassadorImages;

// TODO: add MediaId property
// Почему MediaID? Потому что он нужен фронтенду для загрузки изображения из медиасервиса
public class AmbassadorImageDto
{
    public required string? ImageUrl { get; set; }
    public ImageType ImageType { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<AmbassadorImage, AmbassadorImageDto>()
                .ForMember(
                    dest => dest.ImageUrl,
                    opt => opt.MapFrom<ImageUrlResolver, Guid?>(src => src.MediaId));
        }
    }
}

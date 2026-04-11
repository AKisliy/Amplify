using UserService.Domain.Entities;
using UserService.Domain.Enums;

namespace UserService.Application.AmbassadorImages.Queries.GetAmbassadorImages;

public class AmbassadorImageDto
{
    public Guid MediaId { get; set; }
    public ImageType ImageType { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<AmbassadorImage, AmbassadorImageDto>();
        }
    }
}

using Publisher.Application.Common.Mappings;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Application.Publications.Models;

public class MediaPostDto
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Description { get; set; } = null!;

    public string MediaUrl { get; set; } = null!;

    public string? CoverUrl { get; set; }

    public PublicationType PublicationType { get; set; }

    public IList<PublicationRecordDto> PublicationRecords { get; set; } = [];

    public InstagramSettingsDto? InstagramPublishingPreset { get; set; } = null!;

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<MediaPost, MediaPostDto>()
                .ForMember(
                    dest => dest.MediaUrl,
                    opt => opt.MapFrom<ImageUrlResolver, Guid>(src => src.MediaId))
                .ForMember(
                    dest => dest.CoverUrl,
                    opt => opt.MapFrom<ImageUrlResolver, Guid?>(src => src.CoverMediaId))
                .ForMember(
                    dest => dest.PublicationRecords,
                    opt => opt.MapFrom(src => src.PublicationRecords));
        }
    }
}

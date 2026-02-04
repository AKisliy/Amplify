using Publisher.Application.Common.Mappings;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Models;

public class MediaPostResponseDto
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Description { get; set; } = null!;

    public string MediaUrl { get; set; } = null!;

    public string? CoverUrl { get; set; }

    public PublicationType PublicationType { get; set; }

    public IList<PublicationRecordResponseDto> PublicationRecords { get; set; } = [];

    public InstagramSettingsDto? InstagramSettings { get; set; } = null!;

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<MediaPost, MediaPostResponseDto>()
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

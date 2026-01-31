using Publisher.Application.AutoLists.Queries.GetAutoList;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Models;

public class PublicationRecordResponseDto
{
    public Guid Id { get; set; }

    public SocialProvider Provider { get; set; }

    public PublicationStatus Status { get; set; }

    public string? PublicUrl { get; set; }

    public FullSocialAccountDto SocialAccount { get; set; } = null!;

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<PublicationRecord, PublicationRecordResponseDto>();
        }
    }
}

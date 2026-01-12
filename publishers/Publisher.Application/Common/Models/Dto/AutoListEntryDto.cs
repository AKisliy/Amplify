using Publisher.Core.Entities;

namespace Publisher.Application.Common.Models.Dto;

public class AutoListEntryDto
{
    public int DayOfWeeks { get; init; }

    public TimeOnly PublicationTime { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<AutoListEntryDto, AutoListEntry>();
        }
    }
}

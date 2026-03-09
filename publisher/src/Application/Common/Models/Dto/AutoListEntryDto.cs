using Publisher.Domain.Entities;

namespace Publisher.Application.AutoLists.Commands.CreateAutoList;

public class AutoListEntryDto
{
    public Guid Id { get; set; }

    public int DayOfWeeks { get; init; }

    public TimeOnly PublicationTime { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<AutoListEntryDto, AutoListEntry>().ReverseMap();
        }
    }
}


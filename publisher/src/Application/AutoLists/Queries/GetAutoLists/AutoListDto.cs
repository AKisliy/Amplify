using Publisher.Domain.Entities;

namespace Publisher.Application.AutoLists.Queries.GetAutoLists;

public class AutoListDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<AutoList, AutoListDto>();
        }
    }
}

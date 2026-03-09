using UserService.Application.Common.Mappings;
using UserService.Domain.Entities;

namespace UserService.Application.Projects.Queries.GetUserProjects;

public class ProjectDto
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public string? Photo { get; set; }

    public Guid? AmbassadorId { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<Project, ProjectDto>()
                .ForMember(
                    dest => dest.Photo,
                    opt => opt.MapFrom<ImageUrlResolver, Guid?>(src => src.Photo))
                .ForMember(
                    dest => dest.AmbassadorId,
                    opt => opt.MapFrom(src => src.Ambassador != null ? src.Ambassador.Id : (Guid?)null));
        }
    }
}

using UserService.Domain.Entities;

namespace UserService.Application.Projects.Queries.GetUserProjects;

public class ProjectDto
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public string? Photo { get; set; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<Project, ProjectDto>();
        }
    }
}

using UserService.Application.Common.Interfaces;
using UserService.Application.Projects.Queries.GetUserProjects;

namespace UserService.Application.Projects.GetUserProjects.Queries;

public class GetUserProjectsQuery : IRequest<IReadOnlyCollection<ProjectDto>>;

public class GetUserProjectsQueryHandler(IApplicationDbContext dbContext, IUser user, IMapper mapper)
    : IRequestHandler<GetUserProjectsQuery, IReadOnlyCollection<ProjectDto>>
{
    public async Task<IReadOnlyCollection<ProjectDto>> Handle(
        GetUserProjectsQuery request,
        CancellationToken cancellationToken)
    {
        // TODO: Add user ID presence check
        var projects = await dbContext.Projects
            .Where(x => x.UserId == user.Id)
            .OrderByDescending(x => x.Created)
            .ToListAsync();

        var projectDtos = mapper.Map<IReadOnlyCollection<ProjectDto>>(projects);
        
        // Populate AmbassadorId for each project
        var projectIds = projectDtos.Select(p => p.Id).ToList();
        var ambassadors = await dbContext.Ambassadors
            .Where(a => projectIds.Contains(a.ProjectId))
            .Select(a => new { a.Id, a.ProjectId })
            .ToListAsync();
        
        foreach (var projectDto in projectDtos)
        {
            var ambassador = ambassadors.FirstOrDefault(a => a.ProjectId == projectDto.Id);
            if (ambassador != null)
            {
                projectDto.AmbassadorId = ambassador.Id;
            }
        }
        
        return projectDtos;
    }
}

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
            .Include(x => x.Ambassador)
            .Where(x => x.UserId == user.Id)
            .OrderByDescending(x => x.Created)
            .ToListAsync(cancellationToken);

        var projectDtos = mapper.Map<IReadOnlyCollection<ProjectDto>>(projects);
        return projectDtos;
    }
}

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
        var projects = await dbContext.Projects
            .Where(x => x.UserId == user.Id)
            .OrderByDescending(x => x.Created)
            .ProjectTo<ProjectDto>(mapper.ConfigurationProvider)
            .ToListAsync();

        return projects;
    }
}

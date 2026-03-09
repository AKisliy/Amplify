using UserService.Application.Common.Interfaces;
using UserService.Application.Projects.Queries.GetUserProjects;

namespace UserService.Application.Projects.Queries.GetProject;

public record GetProjectQuery(Guid Id) : IRequest<ProjectDto>;

public class GetProjectQueryHandler(IApplicationDbContext dbContext, IUser user, IMapper mapper)
    : IRequestHandler<GetProjectQuery, ProjectDto>
{
    public async Task<ProjectDto> Handle(GetProjectQuery request, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects
            .Include(x => x.Ambassador)
            .Where(x => x.Id == request.Id)
            .FirstAsync(cancellationToken);
        Guard.Against.NotFound(request.Id, project);

        if (project.UserId != user.Id)
        {
            throw new UnauthorizedAccessException("Trying to access project which not belongs to current user");
        }

        return mapper.Map<ProjectDto>(project);
    }
}

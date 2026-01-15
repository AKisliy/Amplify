
using UserService.Application.Common.Interfaces;
using UserService.Domain.Entities;

namespace UserService.Application.Projects.Commands.CreateProject;

public record CreateProjectCommand(string Name, string? Description, string? Photo) : IRequest<Guid>;

public class CreateProjectCommandHandler(
    IApplicationDbContext dbContext,
    IUser user) : IRequestHandler<CreateProjectCommand, Guid>
{
    public async Task<Guid> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        var userId = Guard.Against.Null(user.Id, message: "User id wasn't set");

        var project = new Project()
        {
            Name = request.Name,
            Description = request.Description,
            Photo = request.Photo,
            UserId = userId
        };

        dbContext.Projects.Add(project);

        await dbContext.SaveChangesAsync(cancellationToken);

        return project.Id;
    }
}



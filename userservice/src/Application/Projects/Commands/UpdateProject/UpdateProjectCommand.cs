using UserService.Application.Common.Interfaces;

namespace UserService.Application.Projects.Commands.UpdateProject;

public record UpdateProjectCommand(
    Guid Id,
    string Name,
    string? Description,
    Guid? Photo) : IRequest;

public class UpdateProjectCommandHandler(
    IApplicationDbContext dbContext,
    IUser currentUser) : IRequestHandler<UpdateProjectCommand>
{
    public async Task Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Projects
            .FindAsync(new object[] { request.Id }, cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        if (entity.UserId != currentUser.Id)
        {
            throw new UnauthorizedAccessException("Resource access denied");
        }

        entity.Name = request.Name;
        entity.Description = request.Description;
        entity.Photo = request.Photo;

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

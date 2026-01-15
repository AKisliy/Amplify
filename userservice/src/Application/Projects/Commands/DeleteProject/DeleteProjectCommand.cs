using UserService.Application.Common.Interfaces;

namespace UserService.Application.Projects.Commands.DeleteProject;

public record DeleteProjectCommand(Guid Id) : IRequest;

public class DeleteProjectCommandHandler(IApplicationDbContext dbContext) : IRequestHandler<DeleteProjectCommand>
{
    public async Task Handle(DeleteProjectCommand request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Projects
            .Where(p => p.Id == request.Id)
            .SingleOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        dbContext.Projects.Remove(entity);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

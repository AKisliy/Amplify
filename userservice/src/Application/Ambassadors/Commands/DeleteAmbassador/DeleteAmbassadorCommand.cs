using UserService.Application.Common.Interfaces;

namespace UserService.Application.Ambassadors.Commands.DeleteAmbassador;

public record DeleteAmbassadorCommand(Guid Id) : IRequest;

public class DeleteAmbassadorCommandHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<DeleteAmbassadorCommand>
{
    public async Task Handle(DeleteAmbassadorCommand request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Ambassadors
            .Where(a => a.Id == request.Id)
            .SingleOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        if (entity.CreatedBy != user.Id)
        {
            throw new UnauthorizedAccessException("Resource access denied");
        }

        dbContext.Ambassadors.Remove(entity);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
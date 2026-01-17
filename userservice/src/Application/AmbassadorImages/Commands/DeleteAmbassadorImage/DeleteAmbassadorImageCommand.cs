using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Models;

namespace UserService.Application.AmbassadorImages.Commands.DeleteAmbassadorImage;

public record DeleteAmbassadorImageCommand(Guid AmbassadorId, Guid ImageId) : IRequest<Result>;

public class DeleteAmbassadorImageCommandHandler(IApplicationDbContext dbContext)
    : IRequestHandler<DeleteAmbassadorImageCommand, Result>
{
    public async Task<Result> Handle(DeleteAmbassadorImageCommand request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.AmbassadorImages
            .Where(ai => ai.AmbassadorId == request.AmbassadorId && ai.Id == request.ImageId)
            .SingleOrDefaultAsync(cancellationToken);

        if (entity == null)
        {
            return Result.Failure([new("Ambassador image not found.")]);
        }

        dbContext.AmbassadorImages.Remove(entity);

        // TODO: Consider adding domain event for deletion if needed
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}


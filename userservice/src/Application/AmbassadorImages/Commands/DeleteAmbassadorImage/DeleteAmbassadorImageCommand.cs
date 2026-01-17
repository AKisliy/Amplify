using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Models;
using UserService.Domain.Events.AmbassadorImages;

namespace UserService.Application.AmbassadorImages.Commands.DeleteAmbassadorImage;

public record DeleteAmbassadorImageCommand(Guid AmbassadorId, Guid ImageId) : IRequest<Result>;

public class DeleteAmbassadorImageCommandHandler(IApplicationDbContext dbContext)
    : IRequestHandler<DeleteAmbassadorImageCommand, Result>
{
    public async Task<Result> Handle(DeleteAmbassadorImageCommand request, CancellationToken cancellationToken)
    {
        // TODO: Consider MediaId usage
        var entity = await dbContext.AmbassadorImages
            .Where(ai => ai.AmbassadorId == request.AmbassadorId && ai.MediaId == request.ImageId)
            .SingleOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.ImageId, entity, parameterName: "Ambassador Image");

        entity.AddDomainEvent(new AmbassadorImageDeletedEvent { Entity = entity });

        dbContext.AmbassadorImages.Remove(entity);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}


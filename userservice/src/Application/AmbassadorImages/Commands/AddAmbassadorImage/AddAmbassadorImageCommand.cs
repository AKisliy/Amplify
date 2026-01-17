using UserService.Application.Common.Interfaces;
using UserService.Domain.Entities;
using UserService.Domain.Enums;

namespace UserService.Application.AmbassadorImages.Commands.AddAmbassadorImage;

public record AddAmbassadorImageCommand(Guid AmbassadorId, Guid MediaId, ImageType ImageType) : IRequest<Guid>;

public class AddAmbassadorImageCommandHandler(IApplicationDbContext dbContext)
    : IRequestHandler<AddAmbassadorImageCommand, Guid>
{
    public async Task<Guid> Handle(AddAmbassadorImageCommand request, CancellationToken cancellationToken)
    {
        var entity = new AmbassadorImage
        {
            AmbassadorId = request.AmbassadorId,
            MediaId = request.MediaId,
            ImageType = request.ImageType
        };

        // TODO: Consider domain events if needed
        dbContext.AmbassadorImages.Add(entity);

        await dbContext.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}

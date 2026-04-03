using Microsoft.Extensions.Logging;
using UserService.Application.Common.Interfaces;
using UserService.Domain.Enums;

namespace UserService.Application.ProjectAssets.Commands.AddProjectAsset;

public record AddProjectAssetCommand(
    Guid ProjectId,
    Guid MediaId,
    Guid? Id = null,
    AssetLifetime Lifetime = AssetLifetime.Intermediate) : IRequest<Guid>;

public class AddProjectAssetCommandHandler(
    IApplicationDbContext dbContext,
    ILogger<AddProjectAssetCommandHandler> logger) : IRequestHandler<AddProjectAssetCommand, Guid>
{
    public Task<Guid> Handle(AddProjectAssetCommand request, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Handling AddProjectAssetCommand for ProjectId: {ProjectId} and MediaId: {MediaId}",
            request.ProjectId,
            request.MediaId);

        var projectAsset = new Domain.Entities.ProjectAsset
        {
            Id = request.Id ?? Guid.NewGuid(),
            ProjectId = request.ProjectId,
            MediaId = request.MediaId,
            Lifetime = request.Lifetime,
        };

        dbContext.ProjectAssets.Add(projectAsset);
        return dbContext.SaveChangesAsync(cancellationToken)
            .ContinueWith(_ => projectAsset.Id, cancellationToken);
    }
}

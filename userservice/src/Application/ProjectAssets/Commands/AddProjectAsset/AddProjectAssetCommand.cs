using Microsoft.Extensions.Logging;
using UserService.Application.Common.Interfaces;
using UserService.Domain.Enums;
using UserService.Domain.Entities;

namespace UserService.Application.ProjectAssets.Commands.AddProjectAsset;

public record AddProjectAssetCommand(
    Guid ProjectId,
    Guid MediaId,
    Guid? Id = null,
    Guid? TemplateId = null,
    AssetLifetime Lifetime = AssetLifetime.Intermediate,
    AssetMediaType MediaType = AssetMediaType.Image) : IRequest<Guid>;

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

        var projectAsset = new ProjectAsset
        {
            Id = request.Id ?? Guid.NewGuid(),
            ProjectId = request.ProjectId,
            MediaId = request.MediaId,
            Lifetime = request.Lifetime,
            MediaType = request.MediaType,
            TemplateId = request.TemplateId
        };

        dbContext.ProjectAssets.Add(projectAsset);
        return dbContext.SaveChangesAsync(cancellationToken)
            .ContinueWith(_ => projectAsset.Id, cancellationToken);
    }
}

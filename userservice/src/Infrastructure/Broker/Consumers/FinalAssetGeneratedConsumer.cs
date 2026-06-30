using Contracts;
using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Options;
using UserService.Application.ProjectAssets.Commands.AddProjectAsset;
using UserService.Domain.Enums;

namespace UserService.Infrastructure.Broker.Consumers;

internal class FinalAssetGeneratedConsumer(
    IMediator mediator,
    IBus bus,
    IOptions<FrontendOptions> frontendOptions,
    ILogger<FinalAssetGeneratedConsumer> logger) : IConsumer<FinalAssetGenerated>
{
    public async Task Consume(ConsumeContext<FinalAssetGenerated> context)
    {
        var msg = context.Message;

        logger.LogInformation(
            "Consumed FinalAssetGenerated: id={Id} projectId={ProjectId} mediaId={MediaId}",
            msg.Id, msg.ProjectId, msg.MediaId);

        var mediaType = msg.MediaType.Equals("video", StringComparison.OrdinalIgnoreCase)
            ? AssetMediaType.Video
            : AssetMediaType.Image;

        await mediator.Send(new AddProjectAssetCommand(
            msg.ProjectId,
            msg.MediaId,
            Id: msg.Id,
            TemplateId: msg.TemplateId,
            Lifetime: AssetLifetime.Permanent,
            MediaType: mediaType));

        var frontendUrl = $"{frontendOptions.Value.Url}/projects/{msg.ProjectId}/assets/{msg.Id}";

        await bus.Publish(new AssetRegistered
        {
            Id = msg.Id,
            JobId = msg.JobId,
            UserId = msg.UserId,
            ProjectId = msg.ProjectId,
            MediaId = msg.MediaId,
            MediaType = msg.MediaType,
            AutoListIds = msg.AutoListIds,
            Description = msg.Description,
            FrontendUrl = frontendUrl
        }, context.CancellationToken);

        logger.LogInformation("Published AssetRegistered for asset {Id}", msg.Id);
    }
}

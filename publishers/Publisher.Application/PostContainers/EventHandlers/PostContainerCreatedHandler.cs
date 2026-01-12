using MassTransit;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Contracts.Events;
using Publisher.Core.Entities;

namespace Publisher.Application.PostContainers.EventHandlers;

public class PostContainerCreatedHandler(
    ILogger<PostContainerCreatedHandler> logger,
    IApplicationDbContext dbContext
) : IConsumer<PostContainerCreated>
{
    public async Task Consume(ConsumeContext<PostContainerCreated> context)
    {
        logger.LogDebug("Post container created event (id: {PostContainerId}) received at Publisher microservice", context.Message.Id);

        var (postContainerId, actorId) = context.Message;

        var postContainer = new PostContainer
        {
            Id = postContainerId,
            ActorId = actorId
        };

        await dbContext.PostContainers.AddAsync(postContainer);
    }
}

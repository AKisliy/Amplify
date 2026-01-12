using MassTransit;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Contracts.Events;
using Publisher.Core.Entities;

namespace Publisher.Application.CreatedPosts.EventHandlers;

public class PostCreatedHandler(
    ILogger<PostCreatedHandler> logger,
    IApplicationDbContext dbContext
) : IConsumer<PostCreated>
{
    public async Task Consume(ConsumeContext<PostCreated> context)
    {
        logger.LogDebug("Post created event (id: {CreatedPostId}) received at Publisher microservice", context.Message.Id);

        var message = context.Message;
        Guard.Against.Null(message);

        var postContainer = await dbContext.PostContainers.SingleOrDefaultAsync(
            x => x.Id == message.PostContainerId,
            context.CancellationToken
        );

        Guard.Against.NotFound(message.PostContainerId, postContainer);

        var createdPost = new CreatedPost
        {
            Id = message.Id,
            FileKey = message.FileUrl,
            CoverFileKey = message.CoverUrl,
            Description = message.Description,
            PostContainerId = message.PostContainerId
        };

        dbContext.CreatedPosts.Add(createdPost);

        await dbContext.SaveChangesAsync(context.CancellationToken);

        logger.LogDebug("Post with ID {CreatedPostId} was saved", createdPost.Id);
    }
}

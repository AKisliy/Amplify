using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;

namespace Publisher.Application.Publications.Commands.RegisterMediaPost;

public record RegisterMediaPostCommand(
    Guid Id,
    Guid UserId,
    Guid ProjectId,
    Guid MediaId) : IRequest;

public class RegisterMediaPostCommandHandler(
    ILogger<RegisterMediaPostCommandHandler> logger,
    IApplicationDbContext dbContext) : IRequestHandler<RegisterMediaPostCommand>
{
    public async Task Handle(RegisterMediaPostCommand request, CancellationToken cancellationToken)
    {
        var exists = await dbContext.MediaPosts
            .AnyAsync(p => p.Id == request.Id, cancellationToken);

        if (exists)
        {
            logger.LogInformation("MediaPost {Id} already registered, skipping", request.Id);
            return;
        }

        var post = new MediaPost
        {
            Id = request.Id,
            UserId = request.UserId,
            ProjectId = request.ProjectId,
            MediaId = request.MediaId,
            PublicationType = PublicationType.AutoList,
            ProcessedInAutoList = false,
        };

        dbContext.MediaPosts.Add(post);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Registered MediaPost {Id} for media {MediaId}", request.Id, request.MediaId);
    }
}

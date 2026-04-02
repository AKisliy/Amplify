using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Events;

namespace Publisher.Application.Publications.Commands.PublishFromCanvas;

public record PublishFromCanvasCommand(Guid MediaId, Guid AutoListId) : IRequest;

public class PublishFromCanvasCommandHandler(
    ILogger<PublishFromCanvasCommandHandler> logger,
    IApplicationDbContext dbContext) : IRequestHandler<PublishFromCanvasCommand>
{
    public async Task Handle(PublishFromCanvasCommand request, CancellationToken cancellationToken)
    {
        var autoList = await dbContext.AutoLists
            .Include(al => al.Accounts)
            .Include(al => al.Project)
            .SingleOrDefaultAsync(al => al.Id == request.AutoListId, cancellationToken);

        Guard.Against.NotFound(request.AutoListId, autoList);

        var post = new MediaPost
        {
            MediaId = request.MediaId,
            AutoListId = autoList.Id,
            ProjectId = autoList.ProjectId,
            UserId = autoList.Project.UserId,
            PublicationType = PublicationType.AutoList,
            ProcessedInAutoList = true,
        };
        dbContext.MediaPosts.Add(post);

        foreach (var account in autoList.Accounts)
        {
            var record = new PublicationRecord
            {
                MediaPost = post,
                SocialAccountId = account.Id,
                Status = PublicationStatus.Scheduled,
                Provider = account.Provider,
            };
            record.AddDomainEvent(new PublicationRecordCreated(record));
            dbContext.PublicationRecords.Add(record);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Queued {Count} publication(s) for media {MediaId} via AutoList {AutoListId}",
            autoList.Accounts.Count, request.MediaId, request.AutoListId);
    }
}

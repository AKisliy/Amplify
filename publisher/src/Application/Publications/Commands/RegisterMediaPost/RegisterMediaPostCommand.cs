using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Domain.Events;

namespace Publisher.Application.Publications.Commands.RegisterMediaPost;

public record RegisterMediaPostCommand(
    Guid Id,
    Guid UserId,
    Guid ProjectId,
    Guid MediaId,
    List<Guid>? AutoListIds = null,
    string? Description = null) : IRequest;

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
        };

        dbContext.MediaPosts.Add(post);

        if (request.AutoListIds?.Count > 0)
        {
            foreach (var autoListId in request.AutoListIds)
            {
                await ScheduleInAutoList(post, autoListId, request.Description, cancellationToken);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Registered MediaPost {Id} for media {MediaId}", request.Id, request.MediaId);
    }

    private async Task ScheduleInAutoList(MediaPost post, Guid autoListId, string? description, CancellationToken ct)
    {
        var autoList = await dbContext.AutoLists
            .Include(al => al.Entries)
            .Include(al => al.Accounts)
            .SingleOrDefaultAsync(al => al.Id == autoListId, ct);

        if (autoList is null)
        {
            logger.LogWarning("AutoList {AutoListId} not found, MediaPost {Id} saved without scheduling",
                autoListId, post.Id);
            return;
        }

        if (!autoList.Entries.Any() || !autoList.Accounts.Any())
        {
            logger.LogWarning("AutoList {AutoListId} has no entries or accounts, skipping scheduling", autoListId);
            return;
        }

        // Find slots already occupied by other scheduled records in this AutoList
        var occupiedSlots = await (
            from r in dbContext.PublicationRecords
            join e in dbContext.AutoListEntries on r.AutoListEntryId equals e.Id
            where r.ScheduledAt != null &&
                  r.Status == PublicationStatus.Scheduled &&
                  e.AutoListId == autoListId
            select r.ScheduledAt!.Value
        ).Distinct().ToListAsync(ct);

        var now = DateTimeOffset.UtcNow;

        var slot = autoList.Entries
            .SelectMany(entry => GetSystemDays(entry.DayOfWeeks)
                .Select(dow => (ScheduledAt: NextOccurrence(dow, entry.PublicationTime, now), EntryId: entry.Id)))
            .OrderBy(c => c.ScheduledAt)
            .Cast<(DateTimeOffset ScheduledAt, Guid EntryId)?>()
            .FirstOrDefault(c => !occupiedSlots.Contains(c!.Value.ScheduledAt));

        if (slot is null)
        {
            logger.LogWarning("No free slot found in AutoList {AutoListId} for MediaPost {Id}", autoListId, post.Id);
            return;
        }

        logger.LogInformation(
            "Scheduling MediaPost {Id} in AutoList {AutoListId} at {ScheduledAt} (entry {EntryId})",
            post.Id, autoListId, slot.Value.ScheduledAt, slot.Value.EntryId);

        foreach (var account in autoList.Accounts)
        {
            var record = new PublicationRecord
            {
                MediaPost = post,
                SocialAccountId = account.Id,
                Provider = account.Provider,
                Status = PublicationStatus.Scheduled,
                PublicationType = PublicationType.AutoList,
                ScheduledAt = slot.Value.ScheduledAt,
                AutoListEntryId = slot.Value.EntryId,
                Description = description
            };
            record.AddDomainEvent(new PublicationRecordCreated(record));
            dbContext.PublicationRecords.Add(record);
        }
    }

    // ---------------------------------------------------------------------------
    // Slot calculation helpers
    // ---------------------------------------------------------------------------

    private static IEnumerable<System.DayOfWeek> GetSystemDays(int mask)
    {
        var flags = (Domain.Enums.DayOfWeek)mask;
        if (flags.HasFlag(Domain.Enums.DayOfWeek.Monday)) yield return System.DayOfWeek.Monday;
        if (flags.HasFlag(Domain.Enums.DayOfWeek.Tuesday)) yield return System.DayOfWeek.Tuesday;
        if (flags.HasFlag(Domain.Enums.DayOfWeek.Wednesday)) yield return System.DayOfWeek.Wednesday;
        if (flags.HasFlag(Domain.Enums.DayOfWeek.Thursday)) yield return System.DayOfWeek.Thursday;
        if (flags.HasFlag(Domain.Enums.DayOfWeek.Friday)) yield return System.DayOfWeek.Friday;
        if (flags.HasFlag(Domain.Enums.DayOfWeek.Saturday)) yield return System.DayOfWeek.Saturday;
        if (flags.HasFlag(Domain.Enums.DayOfWeek.Sunday)) yield return System.DayOfWeek.Sunday;
    }

    private static DateTimeOffset NextOccurrence(System.DayOfWeek targetDay, TimeOnly time, DateTimeOffset after)
    {
        var utc = after.UtcDateTime;
        var daysUntil = ((int)targetDay - (int)utc.DayOfWeek + 7) % 7;

        // If today is the day but the time slot has already passed, move to next week
        if (daysUntil == 0 && new TimeOnly(utc.Hour, utc.Minute) >= time)
            daysUntil = 7;

        var targetDate = utc.Date.AddDays(daysUntil);
        return new DateTimeOffset(targetDate.Year, targetDate.Month, targetDate.Day,
            time.Hour, time.Minute, 0, TimeSpan.Zero);
    }
}

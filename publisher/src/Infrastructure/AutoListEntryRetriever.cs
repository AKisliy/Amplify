using Microsoft.EntityFrameworkCore;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;

namespace Publisher.Infrastructure;

public class AutoListEntryRetriever(IApplicationDbContext context)
{
    public async Task<List<AutoListEntry>> GetEntriesForTriggerAsync(DateTimeOffset now, CancellationToken ct)
    {
        var dayOfWeek = (int)GetDayOfWeek(now);
        var curTime = new TimeOnly(now.Hour, now.Minute);

        return await context.AutoListEntries
            .Where(entry => (entry.DayOfWeeks & dayOfWeek) != 0 && entry.PublicationTime == curTime)
            .ToListAsync(ct);
    }

    private Domain.Enums.DayOfWeek GetDayOfWeek(DateTimeOffset dateTime)
    {
        var dayOfWeek = dateTime.DayOfWeek;

        return dayOfWeek switch
        {
            DayOfWeek.Monday => Domain.Enums.DayOfWeek.Monday,
            DayOfWeek.Tuesday => Domain.Enums.DayOfWeek.Tuesday,
            DayOfWeek.Wednesday => Domain.Enums.DayOfWeek.Wednesday,
            DayOfWeek.Thursday => Domain.Enums.DayOfWeek.Thursday,
            DayOfWeek.Friday => Domain.Enums.DayOfWeek.Friday,
            DayOfWeek.Saturday => Domain.Enums.DayOfWeek.Saturday,
            DayOfWeek.Sunday => Domain.Enums.DayOfWeek.Sunday,
            _ => throw new NotImplementedException()
        };
    }
}

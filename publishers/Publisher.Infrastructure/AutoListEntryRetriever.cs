using Microsoft.EntityFrameworkCore;
using Publisher.Application.Common.Interfaces;
using Publisher.Core.Entities;

namespace Publisher.Infrastructure;

public class AutoListEntryRetriever(
    IApplicationDbContext context
) : IAutoListEntryRetriever
{
    public Task<List<AutoListEntry>> GetEntriesForTriggerAsync(DateTimeOffset now, CancellationToken ct)
    {
        var dayOfWeek = (int)GetDayOfWeek(now);
        var curTime = new TimeOnly(now.Hour, now.Minute);

        return context.AutoListEntries
            .Where(entry => (entry.DayOfWeeks & dayOfWeek) != 0 && entry.PublicationTime == curTime)
            .ToListAsync();
    }

    private Core.Enums.DayOfWeek GetDayOfWeek(DateTimeOffset dateTime)
    {
        var dayOfWeek = dateTime.DayOfWeek;

        return dayOfWeek switch
        {
            DayOfWeek.Monday => Core.Enums.DayOfWeek.Monday,
            DayOfWeek.Tuesday => Core.Enums.DayOfWeek.Tuesday,
            DayOfWeek.Wednesday => Core.Enums.DayOfWeek.Wednesday,
            DayOfWeek.Thursday => Core.Enums.DayOfWeek.Thursday,
            DayOfWeek.Friday => Core.Enums.DayOfWeek.Friday,
            DayOfWeek.Saturday => Core.Enums.DayOfWeek.Saturday,
            DayOfWeek.Sunday => Core.Enums.DayOfWeek.Sunday,
            _ => throw new NotImplementedException()
        };
    }
}

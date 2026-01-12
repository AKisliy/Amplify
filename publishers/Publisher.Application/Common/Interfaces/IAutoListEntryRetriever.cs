using Publisher.Core.Entities;

namespace Publisher.Application.Common.Interfaces;

public interface IAutoListEntryRetriever
{
    Task<List<AutoListEntry>> GetEntriesForTriggerAsync(DateTimeOffset now, CancellationToken ct);
}

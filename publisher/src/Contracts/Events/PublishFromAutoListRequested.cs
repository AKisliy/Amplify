namespace Publisher.Contracts.Events;

public record PublishFromAutoListRequested(Guid AutoListEntryId, DateTimeOffset Time);

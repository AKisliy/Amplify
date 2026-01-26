namespace Publisher.Contracts.Events;

public record PublishRequested(Guid AutoListEntryId, DateTimeOffset Time);

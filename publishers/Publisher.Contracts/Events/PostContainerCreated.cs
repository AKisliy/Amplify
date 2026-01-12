namespace Publisher.Contracts.Events;

public record PostContainerCreated
(
    Guid Id,
    Guid ActorId
);

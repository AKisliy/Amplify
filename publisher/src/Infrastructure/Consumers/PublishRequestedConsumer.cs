using MassTransit;
using MediatR;
using Microsoft.Extensions.Logging;
using Publisher.Application.Publications.Commands.PublishNextPostInAutoList;
using Publisher.Contracts.Events;

namespace Publisher.Infrastructure.Consumers;

public class PublishRequestedConsumer(
    IMediator mediator,
    ILogger<PublishRequestedConsumer> logger) : IConsumer<PublishFromAutoListRequested>
{
    public async Task Consume(ConsumeContext<PublishFromAutoListRequested> context)
    {
        var autoListEntryId = context.Message.AutoListEntryId;
        var requestedTime = context.Message.Time;
        logger.LogDebug("Consumed event for {AutoListEntryId}", autoListEntryId);

        var publishNextVideoCommand = new PublishNextPostInAutoListCommand(autoListEntryId, requestedTime);

        await mediator.Send(publishNextVideoCommand);
    }
}

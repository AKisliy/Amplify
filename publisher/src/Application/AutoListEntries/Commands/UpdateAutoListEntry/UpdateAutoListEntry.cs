using MediatR;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.AutoListEntries.Commands.UpdateAutoListEntry;

public record UpdateAutoListEntryCommand(
    Guid Id,
    int DaysOfWeek,
    TimeOnly PublicationTime) : IRequest;


public class UpdateAutoListEntryCommandHandler(
    IApplicationDbContext context) : IRequestHandler<UpdateAutoListEntryCommand>
{
    public async Task Handle(UpdateAutoListEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await context.AutoListEntries
            .FindAsync([request.Id], cancellationToken);

        Guard.Against.NotFound(request.Id, entry);

        entry.DayOfWeeks = request.DaysOfWeek;
        entry.PublicationTime = request.PublicationTime;

        await context.SaveChangesAsync(cancellationToken);
    }
}

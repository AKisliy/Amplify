using MediatR;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.AutoListEntries.Commands.DeleteAutoListEntry;

public record DeleteAutoListEntryCommand(
    Guid Id
) : IRequest;

public class DeleteAutoListEntryCommandHandler(
    IApplicationDbContext context
) : IRequestHandler<DeleteAutoListEntryCommand>
{
    public async Task Handle(DeleteAutoListEntryCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.AutoListEntries
            .Where(x => x.Id == request.Id)
            .SingleOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        context.AutoListEntries.Remove(entity);

        await context.SaveChangesAsync(cancellationToken);
    }
}

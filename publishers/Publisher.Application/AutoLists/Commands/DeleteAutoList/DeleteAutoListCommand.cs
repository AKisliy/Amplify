using MediatR;
using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.AutoLists.Commands.DeleteAutoList;

public record DeleteAutoListCommand(
    Guid Id
) : IRequest;

public class DeleteAutoListCommandHandler(
    IApplicationDbContext context
) : IRequestHandler<DeleteAutoListCommand>
{
    public async Task Handle(DeleteAutoListCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.AutoLists
            .Where(x => x.Id == request.Id)
            .SingleOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        context.AutoLists.Remove(entity);

        await context.SaveChangesAsync(cancellationToken);
    }
}

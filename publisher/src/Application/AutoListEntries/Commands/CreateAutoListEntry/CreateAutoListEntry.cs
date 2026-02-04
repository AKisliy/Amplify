using Publisher.Application.AutoLists.Commands.CreateAutoList;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;

namespace Publisher.Application.AutoListEntries.Commands.CreateAutoListEntry;


public record CreateAutoListEntryCommand(Guid AutoListId, AutoListEntryDto Entry) : IRequest<Guid>;

public class CreateAutoListEntryCommandHandler(
    IApplicationDbContext context,
    IMapper mapper) : IRequestHandler<CreateAutoListEntryCommand, Guid>
{
    public async Task<Guid> Handle(CreateAutoListEntryCommand request, CancellationToken cancellationToken)
    {
        AutoListEntry entity = mapper.Map<AutoListEntry>(request.Entry);

        entity.AutoListId = request.AutoListId;

        context.AutoListEntries.Add(entity);

        await context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}

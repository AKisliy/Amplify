using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;

namespace Publisher.Application.AutoLists.Commands.UpdateAutoList;

public record UpdateAutoListCommand(
    Guid Id,
    string Name,
    InstagramSettingsDto? InstagramPreset,
    List<SocialMediaAccountDto> Accounts) : IRequest;

public class UpdateAutoListCommandHandler(IApplicationDbContext context) : IRequestHandler<UpdateAutoListCommand>
{
    public async Task Handle(UpdateAutoListCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.AutoLists
            .SingleAsync(x => x.Id == request.Id, cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        entity.Name = request.Name;

        entity.Accounts = await GetUpdatedAccountsListAsync(request, cancellationToken);

        await context.SaveChangesAsync(cancellationToken);
    }

    private Task<List<SocialAccount>> GetUpdatedAccountsListAsync(UpdateAutoListCommand request, CancellationToken cancellationToken)
    {
        var newIds = request.Accounts.Select(x => x.Id);
        return context.SocialAccounts
            .Where(x => newIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
    }
}
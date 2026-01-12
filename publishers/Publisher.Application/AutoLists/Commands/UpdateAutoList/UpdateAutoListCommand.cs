using MediatR;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Dto;
using Publisher.Core.Entities;

namespace Publisher.Application.AutoLists.Commands.UpdateAutoList;

public record UpdateAutoListCommand
(
    Guid Id,
    string Name,
    InstagramPublishingPresetDto? InstagramPreset,
    List<SocialMediaAccountDto> Accounts
) : IRequest;

public class UpdateTodoItemCommandHandler(
    IApplicationDbContext context,
    IMapper mapper
) : IRequestHandler<UpdateAutoListCommand>
{
    public async Task Handle(UpdateAutoListCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.AutoLists
            .SingleAsync(x => x.Id == request.Id, cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        entity.Name = request.Name;

        entity.InstagramPreset = await UpdateInstagramPresetAsync(request, cancellationToken);

        entity.Accounts = await GetUpdatedAccountsListAsync(request, cancellationToken);

        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task<InstagramPublishingPreset?> UpdateInstagramPresetAsync(UpdateAutoListCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.InstagramPublishingPresets
            .Where(ps => ps.AutoListId == request.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity is not null && request.InstagramPreset is not null)
        {
            context.InstagramPublishingPresets.Entry(entity)
                .CurrentValues
                .SetValues(request.InstagramPreset);
        }

        if (entity is null && request.InstagramPreset is null)
            return null;

        if (entity is not null && request.InstagramPreset is null)
            return null;

        if (entity is null && request.InstagramPreset is not null)
            return mapper.Map<InstagramPublishingPreset>(request.InstagramPreset);

        entity!.ShareToFeed = request.InstagramPreset!.ShareToFeed;
        return entity;
    }

    private Task<List<SocialMediaAccount>> GetUpdatedAccountsListAsync(UpdateAutoListCommand request, CancellationToken cancellationToken)
    {
        var newIds = request.Accounts.Select(x => x.Id);
        return context.SocialMediaAccounts
            .Where(x => newIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
    }
}
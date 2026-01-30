using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Entities.PublicationSetup;

namespace Publisher.Application.AutoLists.Commands.UpdateAutoList;

public record UpdateAutoListCommand(
    Guid Id,
    string Name,
    InstagramSettingsDto? InstagramSettings,
    List<SocialMediaAccountDto> Accounts) : IRequest;

public class UpdateAutoListCommandHandler(IApplicationDbContext context, IMapper mapper)
    : IRequestHandler<UpdateAutoListCommand>
{
    public async Task Handle(UpdateAutoListCommand request, CancellationToken cancellationToken)
    {
        var entity = await context.AutoLists
            .SingleAsync(x => x.Id == request.Id, cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        entity.Name = request.Name;
        entity.Accounts = await GetUpdatedAccountsListAsync(request, cancellationToken);
        entity.PublicationSettings = GetUpdatedPublicationSettings(entity, request.InstagramSettings);

        await context.SaveChangesAsync(cancellationToken);
    }

    private Task<List<SocialAccount>> GetUpdatedAccountsListAsync(UpdateAutoListCommand request, CancellationToken cancellationToken)
    {
        var newIds = request.Accounts.Select(x => x.Id);
        return context.SocialAccounts
            .Where(x => newIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
    }

    private PublicationSettings GetUpdatedPublicationSettings(AutoList autoList, InstagramSettingsDto? instagramSettingsDto)
    {
        var previousSettings = autoList.PublicationSettings;
        if (instagramSettingsDto is null)
        {
            previousSettings.Instagram = null;
        }
        else
        {
            previousSettings.Instagram = mapper.Map<InstagramSettings>(instagramSettingsDto);
        }

        return previousSettings;
    }
}
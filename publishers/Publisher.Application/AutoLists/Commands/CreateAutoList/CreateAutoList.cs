using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Dto;
using Publisher.Core.Entities;

namespace Publisher.Application.AutoLists.Commands.CreateAutoList;

public record CreateAutoListCommand(
    Guid ActorId,
    Guid PostContainerId,
    string Name,
    List<AutoListEntryDto> Entries,
    InstagramPublishingPresetDto? InstagramPreset,
    List<SocialMediaAccountDto> Accounts
) : IRequest<Guid>;


public class CreateAutoListHandler(
    ILogger<CreateAutoListHandler> logger,
    IMapper mapper,
    IApplicationDbContext dbContext
) : IRequestHandler<CreateAutoListCommand, Guid>
{

    public async Task<Guid> Handle(CreateAutoListCommand request, CancellationToken cancellationToken)
    {
        logger.LogDebug("Creating Autolist \"{AutoListName}\" for actor \"{ActorId}", request.Name, request.ActorId);

        var accounts = await GetSocialMediaAccountsAsync(request, cancellationToken);

        var autoList = new AutoList
        {
            Name = request.Name,
            PostContainerId = request.PostContainerId,
            ActorId = request.ActorId,
            InstagramPreset = mapper.Map<InstagramPublishingPreset>(request.InstagramPreset),
            Accounts = accounts,
            Entries = [.. request.Entries.Select(mapper.Map<AutoListEntry>)]
        };

        dbContext.AutoLists.Add(autoList);

        await dbContext.SaveChangesAsync(cancellationToken);

        return autoList.Id;
    }

    private Task<List<SocialMediaAccount>> GetSocialMediaAccountsAsync(CreateAutoListCommand request, CancellationToken cancellationToken)
    {
        var newIds = request.Accounts.Select(x => x.Id);
        return dbContext.SocialMediaAccounts
            .Where(x => newIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
    }
}

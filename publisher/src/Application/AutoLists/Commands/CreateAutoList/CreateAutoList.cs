using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Dto;
using Publisher.Domain.Entities;
using Publisher.Domain.Entities.PublicationSetup;

namespace Publisher.Application.AutoLists.Commands.CreateAutoList;

public record CreateAutoListCommand(
    Guid ProjectId,
    string Name,
    List<AutoListEntryDto> Entries,
    InstagramSettingsDto? InstagramSettings,
    List<SocialMediaAccountDto> Accounts) : IRequest<Guid>;


public class CreateAutoListHandler(
    ILogger<CreateAutoListHandler> logger,
    IMapper mapper,
    IApplicationDbContext dbContext) : IRequestHandler<CreateAutoListCommand, Guid>
{

    public async Task<Guid> Handle(CreateAutoListCommand request, CancellationToken cancellationToken)
    {
        logger.LogDebug("Creating Autolist \"{AutoListName}\" for project \"{ProjectId}", request.Name, request.ProjectId);

        var accounts = await GetSocialMediaAccountsAsync(request, cancellationToken);

        var publicationSettings = new PublicationSettings();
        if (request.InstagramSettings is not null)
        {
            publicationSettings.Instagram = mapper.Map<InstagramSettings>(request.InstagramSettings);
        }

        var autoList = new AutoList
        {
            Name = request.Name,
            ProjectId = request.ProjectId,
            Accounts = accounts,
            Entries = [.. request.Entries.Select(mapper.Map<AutoListEntry>)],
            PublicationSettings = publicationSettings
        };

        dbContext.AutoLists.Add(autoList);

        await dbContext.SaveChangesAsync(cancellationToken);

        return autoList.Id;
    }

    private async Task<List<SocialAccount>> GetSocialMediaAccountsAsync(CreateAutoListCommand request, CancellationToken cancellationToken)
    {
        var ids = request.Accounts.Select(x => x.Id);
        return await dbContext.SocialAccounts
            .Where(x => ids.Contains(x.Id))
            .ToListAsync(cancellationToken);
    }
}

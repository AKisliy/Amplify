using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.Connections.Commands.DisconnectAccount;

public record DisconnectAccountCommand(Guid AccountId, Guid ProjectId) : IRequest;

public class DisconnectAccountCommandHandler(IApplicationDbContext dbContext)
    : IRequestHandler<DisconnectAccountCommand>
{
    public async Task Handle(DisconnectAccountCommand request, CancellationToken cancellationToken)
    {
        var account = await dbContext.SocialAccounts
            .Include(sa => sa.Projects)
            .FirstOrDefaultAsync(sa => sa.Id == request.AccountId, cancellationToken);

        Guard.Against.NotFound(request.AccountId, account);

        var project = account.Projects.FirstOrDefault(p => p.Id == request.ProjectId);
        Guard.Against.NotFound(request.ProjectId, project);

        if (account.Projects.Count == 1)
        {
            dbContext.SocialAccounts.Remove(account);
        }
        else
        {
            account.Projects.Remove(project);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

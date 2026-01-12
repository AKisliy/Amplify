using Publisher.Application.Common.Interfaces;
using Publisher.Core.Entities;
using Publisher.Core.Enums;

namespace Publisher.Application.SocialMediaAccounts.Commands.CreateSocialMediaAccount;

public record CreateSocialMediaAccountCommand(
    string ProviderUserId,
    string AccessToken,
    Guid ActorId,
    SocialMedia SocialMedia
) : IRequest<Guid>;

public class CreateSocialMediaAccountHandler(
    ITokenProtector tokenProtector,
    IApplicationDbContext context
) : IRequestHandler<CreateSocialMediaAccountCommand, Guid>
{
    public async Task<Guid> Handle(CreateSocialMediaAccountCommand request, CancellationToken cancellationToken)
    {
        var protectedToken = tokenProtector.Protect(request.AccessToken, request.SocialMedia);

        var account = new SocialMediaAccount
        {
            ProviderUserId = request.ProviderUserId,
            AccessToken = request.AccessToken,
            ActorId = request.ActorId,
            SocialMedia = request.SocialMedia
        };

        context.SocialMediaAccounts.Add(account);

        await context.SaveChangesAsync(cancellationToken);

        return account.Id;
    }
}

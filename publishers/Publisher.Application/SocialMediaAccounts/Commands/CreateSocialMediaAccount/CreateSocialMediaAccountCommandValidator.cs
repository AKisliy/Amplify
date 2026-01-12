using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.SocialMediaAccounts.Commands.CreateSocialMediaAccount;

public class CreateSocialMediaAccountCommandValidator : AbstractValidator<CreateSocialMediaAccountCommand>
{
    private IApplicationDbContext _context;

    public CreateSocialMediaAccountCommandValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.ProviderUserId)
            .NotEmpty();

        RuleFor(x => x.AccessToken)
            .NotEmpty();

        RuleFor(x => x.ActorId)
            .MustAsync(ActorExists);
    }

    public Task<bool> ActorExists(Guid actorId, CancellationToken cancellationToken)
    {
        return _context.Actors.Where(x => x.Id == actorId).AnyAsync(cancellationToken);
    }
}

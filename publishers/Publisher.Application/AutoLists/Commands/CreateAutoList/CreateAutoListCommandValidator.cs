using FluentValidation;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models.Dto;

namespace Publisher.Application.AutoLists.Commands.CreateAutoList;

public class CreateAutoListCommandValidator : AbstractValidator<CreateAutoListCommand>
{
    private readonly IApplicationDbContext _context;

    public CreateAutoListCommandValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(x => x.Name)
            .NotEmpty();

        RuleFor(x => x.Accounts)
            .NotEmpty()
            .MustAsync(AllAccountsExists)
                .WithMessage("All accounts must be presented in DB")
                .WithErrorCode("Exists");

        RuleFor(m => new { m.Accounts, m.ActorId })
            .MustAsync((x, ct) => AllAccountsAreOwnedByActor(x.ActorId, x.Accounts, ct))
                .WithMessage("All account must be connected to actor");

        RuleFor(x => x.Entries)
            .NotEmpty();
    }

    public async Task<bool> AllAccountsExists(List<SocialMediaAccountDto> accountDtos, CancellationToken cancellationToken)
    {
        var accountIds = accountDtos.Select(x => x.Id);
        var existingAccountsCount = await _context.SocialMediaAccounts
            .Where(x => accountIds.Contains(x.Id)).Distinct().CountAsync(cancellationToken);

        return existingAccountsCount == accountDtos.Count;
    }

    public async Task<bool> AllAccountsAreOwnedByActor(Guid actorId, List<SocialMediaAccountDto> accounts, CancellationToken cancellationToken)
    {
        var accountIds = accounts.Select(x => x.Id);
        var ownedByActorAccountsCount = await _context.SocialMediaAccounts
            .Where(x => accountIds.Contains(x.Id) && x.ActorId == actorId).Distinct().CountAsync(cancellationToken);

        return ownedByActorAccountsCount == accounts.Count;
    }
}

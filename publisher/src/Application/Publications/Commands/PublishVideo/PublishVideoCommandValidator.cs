using Publisher.Application.Common.Interfaces;

namespace Publisher.Application.Publications.Commands.PublishVideo;

public class PublishVideoCommandValidator : AbstractValidator<PublishVideoCommand>
{
    private readonly IApplicationDbContext _dbContext;

    public PublishVideoCommandValidator(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;

        RuleFor(x => x.MediaId)
            .NotEmpty();

        RuleFor(x => x.ProjectId)
            .NotEmpty()
            .MustAsync(ProjectExists).WithMessage("Project does not exist.");

        RuleFor(x => x.AccountIds)
            .NotEmpty().WithMessage("At least one account must be specified.")
            .Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Account IDs must be unique.")
            .Must(ids => ids.All(id => id != Guid.Empty)).WithMessage("Account IDs must not contain empty GUIDs.")
            .MustAsync(AccountIdsExist).WithMessage("One or more account IDs do not exist.");
    }

    private async Task<bool> AccountIdsExist(IReadOnlyList<Guid> list, CancellationToken token)
    {
        var existingCount = await _dbContext.SocialAccounts
            .Where(acc => list.Contains(acc.Id))
            .CountAsync(token);
        return existingCount == list.Count;
    }

    private async Task<bool> ProjectExists(Guid guid, CancellationToken token)
    {
        return await _dbContext.Projects.AnyAsync(p => p.Id == guid, token);
    }
}

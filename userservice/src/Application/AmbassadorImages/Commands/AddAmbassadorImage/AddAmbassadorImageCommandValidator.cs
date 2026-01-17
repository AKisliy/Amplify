using UserService.Application.Common.Interfaces;

namespace UserService.Application.AmbassadorImages.Commands.AddAmbassadorImage;

public class AddAmbassadorImageCommandValidator : AbstractValidator<AddAmbassadorImageCommand>
{
    private readonly IApplicationDbContext _dbContext;

    public AddAmbassadorImageCommandValidator(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;

        RuleFor(x => x.AmbassadorId)
            .NotEmpty()
                .MustAsync(Exist)
                .WithMessage("Ambassador does not exist.");

        RuleFor(x => x.MediaId)
            .NotEmpty();

        RuleFor(x => x.ImageType)
            .IsInEnum();
    }

    public async Task<bool> Exist(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Ambassadors.AnyAsync(x => x.Id == id, cancellationToken);
    }
}

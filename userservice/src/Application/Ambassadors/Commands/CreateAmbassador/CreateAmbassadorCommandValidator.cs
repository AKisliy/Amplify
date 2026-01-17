namespace UserService.Application.Ambassadors.Commands.CreateAmbassador;

public class CreateAmbassadorCommandValidator : AbstractValidator<CreateAmbassadorCommand>
{
    public CreateAmbassadorCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Biography)
            .MaximumLength(2000);

        RuleFor(x => x.BehavioralPatterns)
            .MaximumLength(2000);

        RuleFor(x => x.ProjectId)
            .NotEmpty();
    }
}

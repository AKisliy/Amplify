using FluentValidation;

namespace Publisher.Application.AutoLists.Commands.UpdateAutoList;

public class UpdateAutoListCommandValidator : AbstractValidator<UpdateAutoListCommand>
{
    public UpdateAutoListCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty();
    }
}

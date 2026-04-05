namespace UserService.Application.Auth.Register;

public class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(6).WithMessage("Passwords must be at least 6 characters.")
            .Matches("[A-Z]").WithMessage("Passwords must have at least one uppercase ('A'-'Z').")
            .Matches("[a-z]").WithMessage("Passwords must have at least one lowercase ('a'-'z').")
            .Matches("[0-9]").WithMessage("Passwords must have at least one digit ('0'-'9').")
            .Matches("[^a-zA-Z0-9]").WithMessage("Passwords must have at least one non alphanumeric character.");
    }
}

using UserService.Application.Common.Interfaces;

namespace UserService.Application.Projects.Commands.CreateProject;

public class CreateProjectCommandValidator : AbstractValidator<CreateProjectCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CreateProjectCommandValidator(IApplicationDbContext context, IUser user)
    {
        _user = user;
        _context = context;

        RuleFor(p => p.Name)
            .NotEmpty()
            .MustAsync(BeUniqueForUser)
                .WithMessage("Project name must be unique for user!")
                .WithErrorCode("Unique");
    }

    public async Task<bool> BeUniqueForUser(string name, CancellationToken cancellationToken)
    {
        return !await _context.Projects
            .AnyAsync(p => p.UserId == _user.Id && p.Name == name, cancellationToken);
    }
}

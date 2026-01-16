using UserService.Application.Common.Interfaces;

namespace UserService.Application.Projects.Commands.UpdateProject;

public class UpdateProjectCommandValidator : AbstractValidator<UpdateProjectCommand>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IUser _user;

    public UpdateProjectCommandValidator(IApplicationDbContext dbContext, IUser user)
    {
        _dbContext = dbContext;
        _user = user;

        RuleFor(p => p.Name)
            .NotEmpty()
            .MustAsync(BeUniqueForUser)
                .WithMessage("Project name must be unique for user!")
                .WithErrorCode("Unique");
    }

    public async Task<bool> BeUniqueForUser(UpdateProjectCommand command, string name, CancellationToken cancellationToken)
    {
        return !await _dbContext.Projects
            .AnyAsync(p =>
                p.UserId == _user.Id &&
                p.Name == name &&
                p.Id != command.Id,
                cancellationToken);
    }
}

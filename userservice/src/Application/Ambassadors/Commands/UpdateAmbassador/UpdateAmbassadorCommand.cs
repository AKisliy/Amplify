using UserService.Application.Common.Interfaces;

namespace UserService.Application.Ambassadors.Commands.UpdateAmbassador;

public record UpdateAmbassadorCommand(
    Guid Id,
    string Name,
    string? Biography,
    string? BehavioralPatterns) : IRequest;

public class UpdateAmbassadorCommandHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<UpdateAmbassadorCommand>
{
    public async Task Handle(UpdateAmbassadorCommand request, CancellationToken cancellationToken)
    {
        var ambassador = await dbContext.Ambassadors.FindAsync(new object[] { request.Id }, cancellationToken);

        Guard.Against.NotFound(request.Id, ambassador, "Ambassador");

        var project = await dbContext.Projects.FindAsync(new object[] { ambassador!.ProjectId }, cancellationToken);

        Guard.Against.NotFound(ambassador.ProjectId, project, "Project");

        if (project!.UserId != user.Id)
        {
            throw new UnauthorizedAccessException("Resource access denied");
        }

        ambassador.Name = request.Name;
        ambassador.Biography = request.Biography;
        ambassador.BehavioralPatterns = request.BehavioralPatterns;

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

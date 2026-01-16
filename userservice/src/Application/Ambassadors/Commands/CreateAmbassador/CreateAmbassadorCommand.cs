using UserService.Application.Common.Interfaces;
using UserService.Domain.Entities;

namespace UserService.Application.Ambassadors.Commands.CreateAmbassador;

public record CreateAmbassadorCommand(
    string Name,
    string? Biography,
    string? BehavioralPatterns,
    Guid ProjectId) : IRequest<Guid>;

public class CreateAmbassadorCommandHandler(IApplicationDbContext dbContext,
    IUser user) : IRequestHandler<CreateAmbassadorCommand, Guid>
{
    public async Task<Guid> Handle(CreateAmbassadorCommand request, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects.FindAsync(new object[] { request.ProjectId }, cancellationToken);

        Guard.Against.NotFound(request.ProjectId, project);

        if (project.UserId != user.Id)
        {
            throw new UnauthorizedAccessException("Resource access denied");
        }

        var ambassador = new Ambassador
        {
            Name = request.Name,
            Biography = request.Biography,
            BehavioralPatterns = request.BehavioralPatterns,
            ProjectId = request.ProjectId
        };

        dbContext.Ambassadors.Add(ambassador);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ambassador.Id;
    }
}
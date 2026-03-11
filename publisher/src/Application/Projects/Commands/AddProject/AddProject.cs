using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Entities;

namespace Publisher.Application.Projects.Commands.AddProject;

public record AddProjectCommand(Guid ProjectId, Guid UserId) : IRequest<Guid>;


internal class AddProjectCommandHandler(IApplicationDbContext dbContext) : IRequestHandler<AddProjectCommand, Guid>
{
    public async Task<Guid> Handle(AddProjectCommand request, CancellationToken cancellationToken)
    {
        var project = new Project
        {
            UserId = request.UserId,
            Id = request.ProjectId
        };

        dbContext.Projects.Add(project);
        await dbContext.SaveChangesAsync(cancellationToken);

        return project.Id;
    }
}
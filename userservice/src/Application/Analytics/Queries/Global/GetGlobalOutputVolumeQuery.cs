using UserService.Application.Analytics.Queries.GetOutputVolume;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.Global;

/// <summary>Global daily output volume (completed + failed jobs) across all projects owned by the current user.</summary>
public record GetGlobalOutputVolumeQuery(DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<OutputVolumeDto>>;

public class GetGlobalOutputVolumeQueryHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<GetGlobalOutputVolumeQuery, IReadOnlyList<OutputVolumeDto>>
{
    public async Task<IReadOnlyList<OutputVolumeDto>> Handle(GetGlobalOutputVolumeQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to   = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue),   DateTimeKind.Utc);

        var projectIds = await dbContext.Projects
            .Where(p => p.UserId == user.Id!.Value)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        if (projectIds.Count == 0)
            return [];

        var rows = await dbContext.JobExecutions
            .Where(x => projectIds.Contains(x.ProjectId)
                     && x.StartedAt >= from
                     && x.StartedAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => DateOnly.FromDateTime(x.StartedAt!.Value))
            .OrderBy(g => g.Key)
            .Select(g => new OutputVolumeDto(
                Date:      g.Key,
                Completed: g.Count(x => x.Status == "COMPLETED"),
                Failed:    g.Count(x => x.Status == "FAILED")))
            .ToList();
    }
}

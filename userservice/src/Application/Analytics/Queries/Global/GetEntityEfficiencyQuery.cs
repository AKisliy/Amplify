using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.Global;

/// <summary>Per-project CPA vs total spend breakdown — the "Entity Efficiency" chart.</summary>
public record GetEntityEfficiencyQuery(DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<EntityEfficiencyDto>>;

public record EntityEfficiencyDto(
    Guid ProjectId,
    string ProjectName,
    double TotalCostUsd,
    int CompletedJobCount,
    double AvgCpa);

public class GetEntityEfficiencyQueryHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<GetEntityEfficiencyQuery, IReadOnlyList<EntityEfficiencyDto>>
{
    public async Task<IReadOnlyList<EntityEfficiencyDto>> Handle(GetEntityEfficiencyQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var projects = await dbContext.Projects
            .Where(p => p.UserId == user.Id!.Value)
            .Select(p => new { p.Id, p.Name })
            .ToListAsync(cancellationToken);

        if (projects.Count == 0)
            return [];

        var projectIds = projects.Select(p => p.Id).ToList();

        var spendRows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId != null
                     && projectIds.Contains(x.ProjectId.Value)
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        var jobRows = await dbContext.JobExecutions
            .Where(x => projectIds.Contains(x.ProjectId)
                     && x.Status == "COMPLETED"
                     && x.StartedAt >= from
                     && x.StartedAt <= to)
            .ToListAsync(cancellationToken);

        var spendByProject = spendRows
            .GroupBy(x => x.ProjectId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.CostUsd ?? 0));

        var jobsByProject = jobRows
            .GroupBy(x => x.ProjectId)
            .ToDictionary(g => g.Key, g => g.Count());

        var nameMap = projects.ToDictionary(p => p.Id, p => p.Name);

        return projectIds
            .Select(id =>
            {
                var spend = spendByProject.GetValueOrDefault(id, 0);
                var jobs = jobsByProject.GetValueOrDefault(id, 0);
                var avgCpa = jobs > 0 ? spend / jobs : 0;
                return new EntityEfficiencyDto(
                    ProjectId: id,
                    ProjectName: nameMap[id],
                    TotalCostUsd: spend,
                    CompletedJobCount: jobs,
                    AvgCpa: avgCpa);
            })
            .OrderByDescending(x => x.TotalCostUsd)
            .ToList();
    }
}

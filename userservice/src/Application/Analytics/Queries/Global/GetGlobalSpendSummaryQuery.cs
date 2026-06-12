using UserService.Application.Analytics.Queries.GetSpendSummary;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.Global;

/// <summary>Global variant of SpendSummary — aggregates across all projects owned by the current user.</summary>
public record GetGlobalSpendSummaryQuery(DateOnly From, DateOnly To)
    : IRequest<SpendSummaryDto>;

public class GetGlobalSpendSummaryQueryHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<GetGlobalSpendSummaryQuery, SpendSummaryDto>
{
    public async Task<SpendSummaryDto> Handle(GetGlobalSpendSummaryQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var projectIds = await dbContext.Projects
            .Where(p => p.UserId == user.Id!.Value)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        if (projectIds.Count == 0)
            return new SpendSummaryDto(0, 0, 0, 0, 0);

        var rows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId != null
                     && projectIds.Contains(x.ProjectId.Value)
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        var jobs = await dbContext.JobExecutions
            .Where(x => projectIds.Contains(x.ProjectId)
                     && x.StartedAt >= from
                     && x.StartedAt <= to)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Completed = g.Count(x => x.Status == "COMPLETED"),
                Failed = g.Count(x => x.Status == "FAILED"),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new SpendSummaryDto(
            TotalCostUsd: rows.Sum(x => x.CostUsd ?? 0),
            TotalTokens: rows.Sum(x => (long)x.TotalTokens),
            RequestCount: rows.Count,
            CompletedJobCount: jobs?.Completed ?? 0,
            FailedJobCount: jobs?.Failed ?? 0);
    }
}

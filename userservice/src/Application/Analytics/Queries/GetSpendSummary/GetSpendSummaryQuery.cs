using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetSpendSummary;

/// <summary>Metric 5: total spend + job counts aggregated for a project over a date range.</summary>
public record GetSpendSummaryQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<SpendSummaryDto>;

public record SpendSummaryDto(
    double TotalCostUsd,
    long TotalTokens,
    int RequestCount,
    int CompletedJobCount,
    int FailedJobCount);

public class GetSpendSummaryQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetSpendSummaryQuery, SpendSummaryDto>
{
    public async Task<SpendSummaryDto> Handle(GetSpendSummaryQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var spendTask = dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId == request.ProjectId
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        var jobsTask = dbContext.JobExecutions
            .Where(x => x.ProjectId == request.ProjectId
                     && x.StartedAt >= from
                     && x.StartedAt <= to)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Completed = g.Count(x => x.Status == "COMPLETED"),
                Failed = g.Count(x => x.Status == "FAILED"),
            })
            .FirstOrDefaultAsync(cancellationToken);

        await Task.WhenAll(spendTask, jobsTask);

        var rows = spendTask.Result;
        var jobs = jobsTask.Result;

        return new SpendSummaryDto(
            TotalCostUsd: rows.Sum(x => x.CostUsd ?? 0),
            TotalTokens: rows.Sum(x => (long)x.TotalTokens),
            RequestCount: rows.Count,
            CompletedJobCount: jobs?.Completed ?? 0,
            FailedJobCount: jobs?.Failed ?? 0);
    }
}

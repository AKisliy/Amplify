using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetSpendSummary;

/// <summary>Metric 5: total spend aggregated for a project over a date range.</summary>
public record GetSpendSummaryQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<SpendSummaryDto>;

public record SpendSummaryDto(
    double TotalCostUsd,
    long TotalTokens,
    int RequestCount);

public class GetSpendSummaryQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetSpendSummaryQuery, SpendSummaryDto>
{
    public async Task<SpendSummaryDto> Handle(GetSpendSummaryQuery request, CancellationToken cancellationToken)
    {
        var from = request.From.ToDateTime(TimeOnly.MinValue);
        var to = request.To.ToDateTime(TimeOnly.MaxValue);

        var rows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId == request.ProjectId
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        return new SpendSummaryDto(
            TotalCostUsd: rows.Sum(x => x.CostUsd ?? 0),
            TotalTokens: rows.Sum(x => (long)x.TotalTokens),
            RequestCount: rows.Count);
    }
}

using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetSpendTrend;

/// <summary>Metric 7: daily spend trend for a project.</summary>
public record GetSpendTrendQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<SpendTrendPointDto>>;

public record SpendTrendPointDto(DateOnly Date, double CostUsd, long Tokens, int Requests);

public class GetSpendTrendQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetSpendTrendQuery, IReadOnlyList<SpendTrendPointDto>>
{
    public async Task<IReadOnlyList<SpendTrendPointDto>> Handle(GetSpendTrendQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var rows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId == request.ProjectId
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => DateOnly.FromDateTime(x.OccurredAt))
            .OrderBy(g => g.Key)
            .Select(g => new SpendTrendPointDto(
                Date: g.Key,
                CostUsd: g.Sum(x => x.CostUsd ?? 0),
                Tokens: g.Sum(x => (long)x.TotalTokens),
                Requests: g.Count()))
            .ToList();
    }
}

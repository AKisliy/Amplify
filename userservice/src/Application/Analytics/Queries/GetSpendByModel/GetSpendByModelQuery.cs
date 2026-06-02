using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetSpendByModel;

/// <summary>Metric 6: spend breakdown by model for a project.</summary>
public record GetSpendByModelQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<ModelSpendDto>>;

public record ModelSpendDto(string Model, double CostUsd, long Tokens, int Requests);

public class GetSpendByModelQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetSpendByModelQuery, IReadOnlyList<ModelSpendDto>>
{
    public async Task<IReadOnlyList<ModelSpendDto>> Handle(GetSpendByModelQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var rows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId == request.ProjectId
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.Model)
            .OrderByDescending(g => g.Sum(x => x.CostUsd ?? 0))
            .Select(g => new ModelSpendDto(
                Model: g.Key,
                CostUsd: g.Sum(x => x.CostUsd ?? 0),
                Tokens: g.Sum(x => (long)x.TotalTokens),
                Requests: g.Count()))
            .ToList();
    }
}

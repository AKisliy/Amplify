using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetSpendByTemplate;

/// <summary>Metric 4: spend breakdown by template for a project.</summary>
public record GetSpendByTemplateQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<TemplateSpendDto>>;

public record TemplateSpendDto(Guid TemplateId, double CostUsd, long Tokens, int Requests, int JobCount);

public class GetSpendByTemplateQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetSpendByTemplateQuery, IReadOnlyList<TemplateSpendDto>>
{
    public async Task<IReadOnlyList<TemplateSpendDto>> Handle(GetSpendByTemplateQuery request, CancellationToken cancellationToken)
    {
        var from = request.From.ToDateTime(TimeOnly.MinValue);
        var to = request.To.ToDateTime(TimeOnly.MaxValue);

        var rows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId == request.ProjectId
                     && x.TemplateId != null
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.TemplateId!.Value)
            .OrderByDescending(g => g.Sum(x => x.CostUsd ?? 0))
            .Select(g => new TemplateSpendDto(
                TemplateId: g.Key,
                CostUsd: g.Sum(x => x.CostUsd ?? 0),
                Tokens: g.Sum(x => (long)x.TotalTokens),
                Requests: g.Count(),
                JobCount: g.Select(x => x.JobId).Distinct().Count()))
            .ToList();
    }
}

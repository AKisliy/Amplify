using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetSpendByJob;

/// <summary>Metric 3: per-job (video run) cost breakdown for a project.</summary>
public record GetSpendByJobQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<JobSpendDto>>;

public record JobSpendDto(Guid JobId, Guid? TemplateId, double CostUsd, long Tokens, int Requests, DateTime StartedAt);

public class GetSpendByJobQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetSpendByJobQuery, IReadOnlyList<JobSpendDto>>
{
    public async Task<IReadOnlyList<JobSpendDto>> Handle(GetSpendByJobQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var rows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId == request.ProjectId
                     && x.JobId != null
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.JobId!.Value)
            .OrderByDescending(g => g.Min(x => x.OccurredAt))
            .Select(g => new JobSpendDto(
                JobId: g.Key,
                TemplateId: g.Select(x => x.TemplateId).FirstOrDefault(t => t != null),
                CostUsd: g.Sum(x => x.CostUsd ?? 0),
                Tokens: g.Sum(x => (long)x.TotalTokens),
                Requests: g.Count(),
                StartedAt: g.Min(x => x.OccurredAt)))
            .ToList();
    }
}

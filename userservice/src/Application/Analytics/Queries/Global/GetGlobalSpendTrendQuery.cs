using UserService.Application.Analytics.Queries.GetSpendTrend;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.Global;

/// <summary>Global daily spend trend across all projects owned by the current user.</summary>
public record GetGlobalSpendTrendQuery(DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<SpendTrendPointDto>>;

public class GetGlobalSpendTrendQueryHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<GetGlobalSpendTrendQuery, IReadOnlyList<SpendTrendPointDto>>
{
    public async Task<IReadOnlyList<SpendTrendPointDto>> Handle(GetGlobalSpendTrendQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var projectIds = await dbContext.Projects
            .Where(p => p.UserId == user.Id!.Value)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        if (projectIds.Count == 0)
            return [];

        var rows = await dbContext.GenerationSpendLogs
            .Where(x => x.ProjectId != null
                     && projectIds.Contains(x.ProjectId.Value)
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

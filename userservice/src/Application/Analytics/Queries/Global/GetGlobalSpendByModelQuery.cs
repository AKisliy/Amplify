using UserService.Application.Analytics.Queries.GetSpendByModel;
using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.Global;

/// <summary>Global spend breakdown by model across all projects owned by the current user.</summary>
public record GetGlobalSpendByModelQuery(DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<ModelSpendDto>>;

public class GetGlobalSpendByModelQueryHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<GetGlobalSpendByModelQuery, IReadOnlyList<ModelSpendDto>>
{
    public async Task<IReadOnlyList<ModelSpendDto>> Handle(GetGlobalSpendByModelQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to   = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue),   DateTimeKind.Utc);

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
            .GroupBy(x => x.Model)
            .OrderByDescending(g => g.Sum(x => x.CostUsd ?? 0))
            .Select(g => new ModelSpendDto(
                Model:    g.Key,
                CostUsd:  g.Sum(x => x.CostUsd ?? 0),
                Tokens:   g.Sum(x => (long)x.TotalTokens),
                Requests: g.Count()))
            .ToList();
    }
}

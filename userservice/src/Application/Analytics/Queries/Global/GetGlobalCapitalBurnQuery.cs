using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.Global;

/// <summary>Daily spend broken down by model across all user's projects — drives the Capital Burn stacked area chart.</summary>
public record GetGlobalCapitalBurnQuery(DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<CapitalBurnPointDto>>;

/// <summary>One row per (date, model) combination.</summary>
public record CapitalBurnPointDto(DateOnly Date, string Model, double CostUsd);

public class GetGlobalCapitalBurnQueryHandler(IApplicationDbContext dbContext, IUser user)
    : IRequestHandler<GetGlobalCapitalBurnQuery, IReadOnlyList<CapitalBurnPointDto>>
{
    public async Task<IReadOnlyList<CapitalBurnPointDto>> Handle(GetGlobalCapitalBurnQuery request, CancellationToken cancellationToken)
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
            .GroupBy(x => (Date: DateOnly.FromDateTime(x.OccurredAt), x.Model))
            .OrderBy(g => g.Key.Date)
            .Select(g => new CapitalBurnPointDto(
                Date:    g.Key.Date,
                Model:   g.Key.Model,
                CostUsd: g.Sum(x => x.CostUsd ?? 0)))
            .ToList();
    }
}

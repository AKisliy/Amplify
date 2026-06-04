using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetNodeFailureRate;

/// <summary>Metric 10: node execution failure rate grouped by node class.</summary>
public record GetNodeFailureRateQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<NodeFailureRateDto>>;

public record NodeFailureRateDto(string ClassName, int Total, int Failed, double FailureRate);

public class GetNodeFailureRateQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetNodeFailureRateQuery, IReadOnlyList<NodeFailureRateDto>>
{
    public async Task<IReadOnlyList<NodeFailureRateDto>> Handle(GetNodeFailureRateQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var rows = await dbContext.NodeExecutionLogs
            .Where(x => x.ProjectId == request.ProjectId
                     && x.OccurredAt >= from
                     && x.OccurredAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.ClassName)
            .OrderByDescending(g => g.Count())
            .Select(g =>
            {
                var total = g.Count();
                var failed = g.Count(x => x.Status == "FAILURE");
                return new NodeFailureRateDto(
                    ClassName: g.Key,
                    Total: total,
                    Failed: failed,
                    FailureRate: total > 0 ? (double)failed / total : 0.0);
            })
            .ToList();
    }
}

using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetGenerationVelocity;

/// <summary>Metric 2: average job execution duration per template (completed jobs only).</summary>
public record GetGenerationVelocityQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<GenerationVelocityDto>>;

public record GenerationVelocityDto(Guid TemplateId, double AvgDurationSec, int JobCount);

public class GetGenerationVelocityQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetGenerationVelocityQuery, IReadOnlyList<GenerationVelocityDto>>
{
    public async Task<IReadOnlyList<GenerationVelocityDto>> Handle(GetGenerationVelocityQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var rows = await dbContext.JobExecutions
            .Where(x => x.ProjectId == request.ProjectId
                     && x.Status == "COMPLETED"
                     && x.DurationSec != null
                     && x.StartedAt >= from
                     && x.StartedAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.TemplateId)
            .OrderByDescending(g => g.Count())
            .Select(g => new GenerationVelocityDto(
                TemplateId: g.Key,
                AvgDurationSec: g.Average(x => (double)x.DurationSec!.Value),
                JobCount: g.Count()))
            .ToList();
    }
}

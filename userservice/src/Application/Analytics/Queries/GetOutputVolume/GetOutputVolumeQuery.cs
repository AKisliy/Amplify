using UserService.Application.Common.Interfaces;

namespace UserService.Application.Analytics.Queries.GetOutputVolume;

/// <summary>Metrics 3 + 8: daily output volume and failed generation overhead.</summary>
public record GetOutputVolumeQuery(Guid ProjectId, DateOnly From, DateOnly To)
    : IRequest<IReadOnlyList<OutputVolumeDto>>;

public record OutputVolumeDto(DateOnly Date, int Completed, int Failed);

public class GetOutputVolumeQueryHandler(IApplicationDbContext dbContext)
    : IRequestHandler<GetOutputVolumeQuery, IReadOnlyList<OutputVolumeDto>>
{
    public async Task<IReadOnlyList<OutputVolumeDto>> Handle(GetOutputVolumeQuery request, CancellationToken cancellationToken)
    {
        var from = DateTime.SpecifyKind(request.From.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(request.To.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

        var rows = await dbContext.JobExecutions
            .Where(x => x.ProjectId == request.ProjectId
                     && x.StartedAt >= from
                     && x.StartedAt <= to)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => DateOnly.FromDateTime(x.StartedAt!.Value))
            .OrderBy(g => g.Key)
            .Select(g => new OutputVolumeDto(
                Date: g.Key,
                Completed: g.Count(x => x.Status == "COMPLETED"),
                Failed: g.Count(x => x.Status == "FAILED")))
            .ToList();
    }
}

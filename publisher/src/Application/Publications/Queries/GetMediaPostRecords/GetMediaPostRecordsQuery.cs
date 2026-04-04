using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;

namespace Publisher.Application.Publications.Queries.GetMediaPostRecords;

public record GetMediaPostRecordsQuery(Guid MediaPostId) : IRequest<List<PublicationRecordResponseDto>>;

public class GetMediaPostRecordsQueryHandler(
    IMapper mapper,
    IApplicationDbContext dbContext) : IRequestHandler<GetMediaPostRecordsQuery, List<PublicationRecordResponseDto>>
{
    public async Task<List<PublicationRecordResponseDto>> Handle(
        GetMediaPostRecordsQuery request,
        CancellationToken cancellationToken)
    {
        return await dbContext.PublicationRecords
            .Where(r => r.MediaPostId == request.MediaPostId)
            .Include(r => r.SocialAccount)
            .ProjectTo<PublicationRecordResponseDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}

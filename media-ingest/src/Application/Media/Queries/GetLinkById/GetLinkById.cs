using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Queries.GetLinkById;

public record GetLinkByIdQuery(Guid MediaId, LinkType LinkType, bool IncludeMetadata = true) : IRequest<GetLinkByIdResponse>;

internal class GetLinkByIdQueryHandler(ILinkGeneratorFactory linkGeneratorFactory)
    : IRequestHandler<GetLinkByIdQuery, GetLinkByIdResponse>
{
    public async Task<GetLinkByIdResponse> Handle(GetLinkByIdQuery request, CancellationToken cancellationToken)
    {
        Guard.Against.Null(request.MediaId, nameof(request.MediaId));
        Guard.Against.Null(request.LinkType, nameof(request.LinkType));

        var linkGenerator = linkGeneratorFactory.GetLinkGenerator(request.LinkType);
        var link = await linkGenerator.GenerateLinkAsync(request.MediaId, request.LinkType, cancellationToken, request.IncludeMetadata);

        return new GetLinkByIdResponse
        {
            MediaId = request.MediaId,
            Link = link
        };
    }
}
using UserService.Application.Common.Interfaces;

namespace UserService.Application.AmbassadorImages.Queries.GetAmbassadorImages;

public record GetAmbassadorImagesQuery(Guid AmbassadorId) : IRequest<IReadOnlyCollection<AmbassadorImageDto>>;

public class GetAmbassadorImagesQueryHandler
    : IRequestHandler<GetAmbassadorImagesQuery, IReadOnlyCollection<AmbassadorImageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetAmbassadorImagesQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IReadOnlyCollection<AmbassadorImageDto>> Handle(GetAmbassadorImagesQuery request, CancellationToken cancellationToken)
    {
        // TODO: Add authorization check to ensure the user has access to the ambassador's images
        var images = await _context.AmbassadorImages
            .Where(ai => ai.AmbassadorId == request.AmbassadorId)
            .ProjectTo<AmbassadorImageDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return images;
    }
}


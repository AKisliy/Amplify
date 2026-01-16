using UserService.Application.Common.Interfaces;

namespace UserService.Application.Ambassadors.Queries.GetAmbassador;

public record GetAmbassadorQuery(Guid Id) : IRequest<AmbassadorDto>;

public class GetAmbassadorQueryHandler(IApplicationDbContext dbContext, IMapper mapper, IUser user)
    : IRequestHandler<GetAmbassadorQuery, AmbassadorDto>
{
    public async Task<AmbassadorDto> Handle(GetAmbassadorQuery request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Ambassadors
            .Where(a => a.Id == request.Id && a.CreatedBy == user.Id)
            .ProjectTo<AmbassadorDto>(mapper.ConfigurationProvider)
            .SingleOrDefaultAsync(cancellationToken);

        Guard.Against.NotFound(request.Id, entity);

        return entity;
    }
}

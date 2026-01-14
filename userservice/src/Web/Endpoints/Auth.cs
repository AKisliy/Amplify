
using UserService.Infrastructure.Identity;

namespace UserService.Web.Endpoints;

public class Auth : EndpointGroupBase
{
    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapIdentityApi<ApplicationUser>();
    }
}

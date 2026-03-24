using System.Security.Claims;
using UserService.Application.Common.Interfaces;
using UserService.Infrastructure.Identity;

namespace UserService.Web.Infrastructure;

public static class CurrentUserMiddleware
{
    public static IApplicationBuilder UseCurrentUser(this IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            var userContext = context.RequestServices.GetRequiredService<IUser>();
            var idClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(idClaim, out var userId))
                userContext.Id = userId;

            var roles = context.User.FindAll(ClaimTypes.Role).Select(x => x.Value).ToList();
            if (roles.Any())
                userContext.Roles = roles;

            await next();
        });

        return app;
    }
}

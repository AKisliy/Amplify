using System.Security.Claims;
using WebSocketGateway.Application.Common.Interfaces;

namespace WebSocketGateway.Web.Infrastructure;

public static class CurrentUserMiddleware
{
    public static IApplicationBuilder UseCurrentUser(this IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            var userContext = context.RequestServices.GetRequiredService<IUser>();
            var id = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(id, out var userId))
                userContext.Id = userId;

            await next();
        });

        return app;
    }
}

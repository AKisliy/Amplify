using MediatR;
using WebSocketGateway.Application.NotificationSettings.Commands.GenerateLinkToken;
using WebSocketGateway.Application.NotificationSettings.Commands.UnlinkTelegram;
using WebSocketGateway.Application.NotificationSettings.Commands.UpdateSettings;
using WebSocketGateway.Application.NotificationSettings.Queries.GetSettings;

namespace WebSocketGateway.Web.Endpoints;

public static class NotificationsEndpoints
{
    public static IEndpointRouteBuilder MapNotificationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications").RequireAuthorization();

        group.MapGet("/settings", (IMediator mediator) =>
            mediator.Send(new GetSettingsQuery()));

        group.MapPatch("/settings", (UpdateSettingsRequest request, IMediator mediator) =>
            mediator.Send(new UpdateSettingsCommand(
                request.NotifyOnlyWhenOffline,
                request.NotifyOnError,
                request.NotifyOnHitl,
                request.NotifyOnCompletion,
                request.NotifyOnPublication)));

        group.MapPost("/telegram/link-token", (IMediator mediator) =>
            mediator.Send(new GenerateLinkTokenCommand()));

        group.MapDelete("/telegram", (IMediator mediator) =>
            mediator.Send(new UnlinkTelegramCommand()));

        return app;
    }
}

public record UpdateSettingsRequest(
    bool NotifyOnlyWhenOffline,
    bool NotifyOnError,
    bool NotifyOnHitl,
    bool NotifyOnCompletion,
    bool NotifyOnPublication);

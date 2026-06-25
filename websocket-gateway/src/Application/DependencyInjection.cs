using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using WebSocketGateway.Application.State;

namespace WebSocketGateway.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));

        services.AddSingleton<JobNotificationStateManager>();
        services.AddSingleton<NodeNotificationStateManager>();

        return services;
    }
}

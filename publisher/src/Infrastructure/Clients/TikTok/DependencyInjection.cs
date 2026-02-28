using Microsoft.Extensions.Hosting;
using Publisher.Application.Common.Interfaces;
using Publisher.Infrastructure.Clients.TikTok;

namespace Microsoft.Extensions.DependencyInjection;

internal static class TikTokDependencyInjection
{
    public static IHostApplicationBuilder AddTikTokConnection(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.AddScoped<IConnectionService, TikTokConnectionService>();
        services.AddScoped<TikTokApiClient>();
        services.AddTikTokHttpClient();


        return builder;
    }

    private static IServiceCollection AddTikTokHttpClient(this IServiceCollection services)
    {
        services.AddHttpClient<TikTokApiClient>(c => c.Timeout = Timeout.InfiniteTimeSpan);
        return services;
    }
}

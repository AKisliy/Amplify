using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Publisher.Application.Common.Interfaces;
using Publisher.Infrastructure.Clients.Instagram;
using Publisher.Infrastructure.Configuration.Resilience;
using Publisher.Infrastructure.Publishers;

namespace Microsoft.Extensions.DependencyInjection;

internal static class InstagramDependencyInjection
{
    internal static IHostApplicationBuilder AddInstagramConnection(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        var environment = builder.Environment;

        services.AddScoped<InstagramApiClient>();
        services.AddScoped<InstagramUrlBuilder>();
        services.AddScoped<InstagramPayloadBuilder>();
        services.AddScoped<InstagramHeaderBuilder>();
        services.AddScoped<IConnectionService, InstagramConnectionService>();
        services.AddInstagramHttpClient();

        if (environment.IsDevelopment() || environment.IsStaging())
        {
            services.AddScoped<ISocialMediaPublisher, DummyInstagramPublisher>();
        }
        else
        {
            services.AddScoped<ISocialMediaPublisher, InstagramPublisher>();
        }

        return builder;
    }

    private static IServiceCollection AddInstagramHttpClient(this IServiceCollection services)
    {
        services.AddHttpClient<InstagramApiClient>(c => c.Timeout = Timeout.InfiniteTimeSpan)
            .AddInstagramConfiguration();

        return services;
    }

    private static IHttpResiliencePipelineBuilder AddInstagramConfiguration(this IHttpClientBuilder httpClientBuilder)
    {
        return httpClientBuilder.AddResilienceHandler("inst_pipeline",
            static pipelineBuilder =>
            {
                pipelineBuilder.AddRetry(RetryOptions.InstagramOptions);
                pipelineBuilder.AddCircuitBreaker(CircuitBreakerOptions.DefaultCircuitBreakerOptions);
                pipelineBuilder.AddTimeout(TimeSpan.FromSeconds(240));
            }
        );
    }
}

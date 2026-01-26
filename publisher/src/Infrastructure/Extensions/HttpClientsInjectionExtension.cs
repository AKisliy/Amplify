using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Publisher.Application.Common.Interfaces;
using Publisher.Infrastructure.Clients.Instagram;
using Publisher.Infrastructure.Configuration.Resilience;

namespace Publisher.Infrastructure.Extensions;

public static class HttpClientInjectionExtensions
{
    public static IServiceCollection AddCustomHttpClients(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddInstagramHttpClient();
        return services;
    }

    private static IServiceCollection AddInstagramHttpClient(this IServiceCollection services)
    {
        services.AddHttpClient<InstagramApiClient>(c => c.Timeout = Timeout.InfiniteTimeSpan)
            .AddInstagramConfiguration();

        // TODO: remove when all API-calls are moved to InstagramApiClient --- IGNORE ---
        services.AddHttpClient<IInstagramIntegrationService, InstagramIntegrationService>(
            c => c.Timeout = Timeout.InfiniteTimeSpan)
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

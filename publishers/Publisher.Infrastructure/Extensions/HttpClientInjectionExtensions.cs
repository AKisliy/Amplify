using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Publisher.Application.Common.Interfaces.Instagram;
using Publisher.Infrastructure.Configuration.Resilience;
using Publisher.Infrastructure.Instagram;

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
        services
            .AddHttpClient<IInstagramApiClient, InstagramApiClient>(c => c.Timeout = Timeout.InfiniteTimeSpan)
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

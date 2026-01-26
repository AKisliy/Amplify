using System.Net;
using Microsoft.Extensions.Http.Resilience;

namespace Publisher.Infrastructure.Configuration.Resilience;

public static class CircuitBreakerOptions
{
    public static readonly HttpCircuitBreakerStrategyOptions DefaultCircuitBreakerOptions = new()
    {
        SamplingDuration = TimeSpan.FromSeconds(10),
        FailureRatio = 0.2,
        MinimumThroughput = 3,
        ShouldHandle = static args =>
        {
            return ValueTask.FromResult(args is
            {
                Outcome.Result.StatusCode:
                    HttpStatusCode.RequestTimeout or
                        HttpStatusCode.TooManyRequests
            });
        }
    };
}

using System.Net;
using Microsoft.Extensions.Http.Resilience;
using Newtonsoft.Json;
using Polly;
using Polly.Retry;
using Publisher.Infrastructure.Models.Instagram;
using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.Configuration.Resilience;

public static class RetryOptions
{
    public static readonly HashSet<int> HandledInstagramSubcodes = new([
        (int)ResponseSubcodes.InstagramServerError,
        (int)ResponseSubcodes.TimeoutDownloadingMedia,
        (int)ResponseSubcodes.MediaBuilderExpired,
        (int)ResponseSubcodes.MediaNotReady,
        (int)ResponseSubcodes.FailedCreateContainer
    ]);

    public static readonly HttpRetryStrategyOptions DefaultRetryOptions = new()
    {
        BackoffType = DelayBackoffType.Exponential,
        MaxRetryAttempts = 5,
        UseJitter = true,
        ShouldHandle = args => args.Outcome switch
       {
           { Exception: HttpRequestException } => PredicateResult.True(),
           { Result.StatusCode: HttpStatusCode.BadRequest } => PredicateResult.True(),
           _ => PredicateResult.False()
       },
    };

    public static readonly RetryStrategyOptions<HttpResponseMessage> InstagramOptions = new()
    {
        BackoffType = DelayBackoffType.Exponential,
        MaxRetryAttempts = 5,
        UseJitter = true,
        ShouldHandle = async args =>
        {
            if (args.Outcome.Exception is not null)
            {
                return args.Outcome.Exception switch
                {
                    HttpRequestException => true,
                    _ => false
                };
            }

            var responseContent = await args.Outcome.Result!.Content.ReadAsStringAsync();
            var parsedResponse = JsonConvert.DeserializeObject<InstagramApiResponse>(responseContent);

            if (parsedResponse is { Error.ErrorSubcode: int subcode })
                return HandledInstagramSubcodes.Contains(subcode);

            return false;
        }
    };
}

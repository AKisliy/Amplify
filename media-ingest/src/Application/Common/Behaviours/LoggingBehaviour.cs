using MediaIngest.Application.Common.Interfaces;
using MediatR.Pipeline;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Application.Common.Behaviours;

public class LoggingBehaviour<TRequest>(ILogger<TRequest> logger) : IRequestPreProcessor<TRequest>
    where TRequest : notnull
{
    private readonly ILogger _logger = logger;

    public Task Process(TRequest request, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("MediaIngest Request: {Name}", requestName);

        return Task.CompletedTask;
    }
}

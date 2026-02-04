using System.Reflection;
using Publisher.Application.Common.Behaviours;
using Microsoft.Extensions.Hosting;
using Publisher.Application.Common.Options;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddApplicationServices(this IHostApplicationBuilder builder)
    {
        builder.Services.AddApplicationOptions();

        builder.Services.AddAutoMapper(Assembly.GetExecutingAssembly());

        builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        builder.Services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
            cfg.AddOpenRequestPreProcessor(typeof(LoggingBehaviour<>));
            cfg.AddOpenBehavior(typeof(UnhandledExceptionBehaviour<,>));
            cfg.AddOpenBehavior(typeof(ValidationBehaviour<,>));
            cfg.AddOpenBehavior(typeof(PerformanceBehaviour<,>));
        });
    }

    private static IServiceCollection AddApplicationOptions(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<ExternalUrlsOptions>(ExternalUrlsOptions.SecionName);

        return services;
    }
}

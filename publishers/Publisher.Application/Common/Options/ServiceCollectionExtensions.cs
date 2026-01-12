using Microsoft.Extensions.DependencyInjection;


namespace Publisher.Application.Common.Options;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddOptionsWithFluentValidation<TOptions>(
        this IServiceCollection services,
        string sectionName)
        where TOptions : class
    {
        services.AddOptions<TOptions>()
            .BindConfiguration(sectionName)
            .ValidateFluentValidation()
            .ValidateOnStart();

        return services;
    }
}

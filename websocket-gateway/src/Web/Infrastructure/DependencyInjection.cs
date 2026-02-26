using Infrastructure.Configuration;
using WebSocketGateway.Infrastructure.Auth;
using WebSocketGateway.Web.Configuration;
using WebSocketGateway.Web.Configuration.Extensions;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.AddInfrastructureOptions();

        builder.AddAuth();
        builder.AddCorsUsage();
    }

    private static IServiceCollection AddInfrastructureOptions(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<CorsOptions>(CorsOptions.SectionName);
        services.AddOptionsWithFluentValidation<JwtOptions>(JwtOptions.ConfigurationSection);

        return services;
    }

    private static void AddCorsUsage(this IHostApplicationBuilder builder)
    {
        var corsOptions = new CorsOptions()
        {
            DefaultPolicyName = ""
        };

        builder.Configuration.GetSection(CorsOptions.SectionName).Bind(corsOptions);

        Guard.Against.NullOrEmpty(corsOptions.DefaultPolicyName, message: "Cors policy name is not set");

        builder.Services.AddCors(options => options.AddPolicy(
            corsOptions.DefaultPolicyName,
            builder => builder.WithOrigins([.. corsOptions.AllowedOrigins])
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()));
    }
}

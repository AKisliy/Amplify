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

        if (builder.Environment.IsDevelopment())
        {
            builder.Services.AddCors(options => options.AddPolicy("Dev",
                p => p.WithOrigins("http://localhost:3000")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()));
        }
    }

    private static IServiceCollection AddInfrastructureOptions(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<JwtOptions>(JwtOptions.ConfigurationSection);

        return services;
    }

}

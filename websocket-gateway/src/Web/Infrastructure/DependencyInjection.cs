using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Infrastructure.Auth;
using WebSocketGateway.Web.Configuration;
using WebSocketGateway.Web.Configuration.Extensions;
using WebSocketGateway.Web.Infrastructure;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static IHostApplicationBuilder AddInfrastructureWebServices(
        this IHostApplicationBuilder builder
    )
    {
        builder.Services.AddOptionsWithFluentValidation<JwtOptions>(
            JwtOptions.ConfigurationSection
        );
        builder.AddAuth();

        builder.Services.AddScoped<IUser, UserContext>();

        if (builder.Environment.IsDevelopment())
        {
            builder.Services.AddCors(options =>
                options.AddPolicy(
                    "Dev",
                    p =>
                        p.WithOrigins("http://localhost:3000")
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .AllowCredentials()
                )
            );
        }

        return builder;
    }
}

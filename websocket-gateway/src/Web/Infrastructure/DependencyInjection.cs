using System.Reflection;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using NSwag;
using NSwag.Generation.Processors.Security;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.Common.Options;
using WebSocketGateway.Infrastructure.Auth;
using WebSocketGateway.Web.Configuration;
using WebSocketGateway.Web.Infrastructure;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static IHostApplicationBuilder AddInfrastructureWebServices(
        this IHostApplicationBuilder builder
    )
    {
        builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        builder.Services.AddOptionsWithFluentValidation<JwtOptions>(
            JwtOptions.ConfigurationSection
        );
        builder.AddAuth();
        builder.Services.AddSignalR();

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

        builder.Services.Configure<ApiBehaviorOptions>(options =>
            options.SuppressModelStateInvalidFilter = true);

        builder.Services.AddHealthChecks();
        builder.Services.AddEndpointsApiExplorer();

        builder.Services.AddOpenApiDocument(
            (configure, sp) =>
            {
                configure.Title = "WS-gateway API";

                // Add JWT
                configure.AddSecurity(
                    "JWT",
                    Enumerable.Empty<string>(),
                    new OpenApiSecurityScheme
                    {
                        Type = OpenApiSecuritySchemeType.ApiKey,
                        Name = "Authorization",
                        In = OpenApiSecurityApiKeyLocation.Header,
                        Description = "Type into the textbox: Bearer {your JWT token}.",
                    }
                );

                configure.OperationProcessors.Add(
                    new AspNetCoreOperationSecurityScopeProcessor("JWT")
                );

                configure.PostProcess = document =>
                {
                    document.Servers.Clear();
                    document.Servers.Add(
                        new OpenApiServer { Url = "/ws-gateway", Description = "WS-gateway API" }
                    );
                };
            }
        );

        return builder;
    }
}

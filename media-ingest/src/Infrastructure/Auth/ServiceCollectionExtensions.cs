using System.Security.Claims;
using System.Text;
using MediaIngest.Application.Common.Options;
using MediaIngest.Infrastructure.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace MediaIngest.Infrastructure.Auth;

internal static class ServiceCollectionExtensions
{
    internal static IHostApplicationBuilder AddAuth(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        services.AddOptionsWithFluentValidation<JwtOptions>(JwtOptions.ConfigurationSection);

        var configuration = builder.Configuration;

        var jwtOptions = new JwtOptions();

        configuration.GetSection(JwtOptions.ConfigurationSection).Bind(jwtOptions);

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                var isDevelopment = builder.Environment.IsDevelopment();

                if (isDevelopment)
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateAudience = false,
                        ValidateIssuer = false,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("ЭТО_МОЙ_СУПЕР_СЕКРЕТНЫЙ_КЛЮЧ_ДЛЯ_ТЕСТОВ_12345")),
                        NameClaimType = ClaimTypes.NameIdentifier
                    };
                }
                else
                {
                    options.Authority = jwtOptions.Issuer;
                    options.RequireHttpsMetadata = false;

                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuers = [jwtOptions.Issuer],

                        ValidateAudience = true,
                        ValidAudience = jwtOptions.Audience,

                        ValidateIssuerSigningKey = true,
                    };
                }
            });

        services.AddAuthorization();

        return builder;
    }
}

using UserService.Application.Common.Interfaces;
using UserService.Domain.Constants;
using UserService.Infrastructure.Data;
using UserService.Infrastructure.Data.Interceptors;
using UserService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using UserService.Infrastructure.Options;
using UserService.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Logging;
using Resend;
using UserService.Application.Common.Interfaces.Clients;
using UserService.Infrastructure.Clients;
using Microsoft.Extensions.Options;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("UserServiceDb");
        Guard.Against.Null(connectionString, message: "Connection string 'UserServiceDb' not found.");

        builder.Services.AddScoped<ITokenService, TokenService>();
        builder.Services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseNpgsql(connectionString);
            options.UseSnakeCaseNamingConvention();
            options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
        });


        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        builder.Services.AddScoped<ApplicationDbContextInitialiser>();

        builder.Services.AddTransient<IEmailService, ResendEmailSender>();

        builder.AddAuth();
        builder.AddMailSender();

        builder.Services.AddInfrastructureOptions();
        builder.AddInternalClients();
    }

    private static void AddInfrastructureOptions(this IServiceCollection services)
    {
        services.AddOptions<JwtOptions>().BindConfiguration(JwtOptions.SectionName);
        services.AddOptions<MyCookiesOptions>().BindConfiguration(MyCookiesOptions.SectionName);
        services.AddOptions<CorsOptions>().BindConfiguration(CorsOptions.SectionName);
        services.AddOptions<InternalUrlsOptions>().BindConfiguration(InternalUrlsOptions.SectionName);
    }

    private static void AddAuth(this IHostApplicationBuilder builder)
    {
        var configuration = builder.Configuration;
        var jwtOptions = new JwtOptions()
        {
            Issuer = "",
            Audience = "",
            PrivateKeyPem = ""
        };

        var cookieOptions = new MyCookiesOptions()
        {
            AccessTokenCookieName = "",
            RefreshTokenCookieName = ""
        };

        IdentityModelEventSource.ShowPII = true;
        IdentityModelEventSource.LogCompleteSecurityArtifact = true;

        configuration.GetSection(JwtOptions.SectionName).Bind(jwtOptions);
        configuration.GetSection(MyCookiesOptions.SectionName).Bind(cookieOptions);

        if (string.IsNullOrEmpty(jwtOptions.PrivateKeyPem))
        {
            throw new InvalidOperationException("Jwt:PrivateKeyPem is missing in configuration.");
        }

        var rsa = RSA.Create();
        rsa.ImportFromPem(jwtOptions.PrivateKeyPem);

        var validationKey = new RsaSecurityKey(rsa)
        {
            KeyId = "auth-key-1"
        };

        builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.SaveToken = true;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,

                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = validationKey,
                    ValidAlgorithms = [SecurityAlgorithms.RsaSha256]
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (context.Request.Cookies.ContainsKey(cookieOptions.AccessTokenCookieName))
                        {
                            context.Token = context.Request.Cookies[cookieOptions.AccessTokenCookieName];
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        builder.Services.AddAuthorizationBuilder();

        builder.Services.AddIdentityCore<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddSignInManager<ApplicationSignInManager>()
            .AddDefaultTokenProviders();

        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddTransient<IIdentityService, IdentityService>();

        builder.Services.AddAuthorization(options =>
            options.AddPolicy(Policies.CanPurge, policy => policy.RequireRole(Roles.Administrator)));

        builder.AddCorsUsage();
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

    private static void AddMailSender(this IHostApplicationBuilder builder)
    {
        var apiToken = builder.Configuration.GetValue<string>("MailOptions:ApiKey");

        Guard.Against.NullOrEmpty(apiToken, message: "Email sender api token isn't set");

        builder.Services.AddHttpClient<ResendClient>();
        builder.Services.Configure<ResendClientOptions>(o => o.ApiToken = apiToken);
        builder.Services.AddTransient<IResend, ResendClient>();
    }

    private static void AddInternalClients(this IHostApplicationBuilder builder)
    {
        builder.Services.AddScoped<IMediaServiceClient, MediaServiceClient>();

        builder.Services.AddHttpClient<IMediaServiceClient, MediaServiceClient>((sp, client) =>
        {
            var internalUrlsOptions = sp.GetRequiredService<IOptions<InternalUrlsOptions>>().Value;

            client.BaseAddress = new Uri(internalUrlsOptions.MediaServiceInternalBaseUrl);
        });
    }
}

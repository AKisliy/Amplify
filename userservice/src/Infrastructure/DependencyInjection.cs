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
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using Resend;
using UserService.Application.Common.Interfaces.Clients;
using UserService.Infrastructure.Clients;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using UserService.Infrastructure.Mail;
using Npgsql;
using Microsoft.EntityFrameworkCore.Migrations;
using UserService.Infrastructure.Broker;
using System.Reflection;
using FluentValidation;
using UserService.Application.Common.Options;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("UserServiceDb");
        Guard.Against.Null(connectionString, message: "Connection string 'UserServiceDb' not found.");

        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        connectionString = connectionBuilder.ToString();

        builder.Services.AddScoped<ITokenService, TokenService>();
        builder.Services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDataProtection()
            .PersistKeysToDbContext<ApplicationDbContext>()
            .SetApplicationName("AmplifyUserService");

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseNpgsql(
                connectionString,
                npgsqlOptions => npgsqlOptions.MigrationsHistoryTable(HistoryRepository.DefaultTableName, ApplicationDbContext.DefaultSchemaName));
            options.UseSnakeCaseNamingConvention();
            options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
        });


        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        builder.Services.AddScoped<ApplicationDbContextInitialiser>();

        if (builder.Environment.IsDevelopment())
        {
            builder.Services.AddTransient<IEmailService, DummyEmailSender>();
        }
        else
        {
            builder.Services.AddTransient<IEmailService, ResendEmailSender>();
        }

        builder.AddAuth();
        builder.AddMailSender();

        builder.Services.AddInfrastructureOptions();
        builder.AddInternalClients();
        builder.Services.AddBrokerConnection();
    }

    private static void AddInfrastructureOptions(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly(), includeInternalTypes: true);

        services.AddOptionsWithFluentValidation<JwtOptions>(JwtOptions.SectionName);
        services.AddOptionsWithFluentValidation<InternalUrlsOptions>(InternalUrlsOptions.SectionName);
        services.AddOptionsWithFluentValidation<UserserviceOptions>(UserserviceOptions.SectionName);
        services.AddOptionsWithFluentValidation<MailOptions>(MailOptions.SectionName);
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


        configuration.GetSection(JwtOptions.SectionName).Bind(jwtOptions);

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

        if (builder.Environment.IsDevelopment())
        {
            builder.Services.AddCors(options => options.AddPolicy("Dev",
                p => p.WithOrigins("http://localhost:3000")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()));
        }

        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders =
                ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownNetworks.Clear();
            options.KnownProxies.Clear();
        });
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

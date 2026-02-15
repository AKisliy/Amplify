using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Options;
using Publisher.Infrastructure;
using Publisher.Infrastructure.Data;
using Publisher.Infrastructure.Data.Interceptors;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Hosting;
using Publisher.Infrastructure.Storage;
using Publisher.Infrastructure.Clients.Instagram;
using FluentValidation;
using System.Reflection;
using Publisher.Infrastructure.Configuration.Options;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;
using Npgsql;
using Publisher.Domain.Enums;
using Polly;
using Publisher.Infrastructure.Models.Instagram;
using Publisher.Infrastructure.Constants;
using Polly.Retry;
using static Publisher.Infrastructure.Constants.InstagramApi;
using Microsoft.Extensions.Logging;
using Publisher.Infrastructure.Extensions;
using MassTransit;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Infrastructure.Factory;
using Publisher.Infrastructure.Workers;
using Publisher.Infrastructure.Consumers;
using Publisher.Infrastructure.Scheduler;
using Microsoft.AspNetCore.Builder;
using Publisher.Infrastructure.Publishers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static IApplicationBuilder UseInfrastructure(this IApplicationBuilder app)
    {
        app.UseScheduler();

        return app;
    }

    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        services.AddInfrastructureOptionsWithFluentValidation();

        builder.AddDatabaseConnection();

        builder.AddAuth();

        services.AddPublishers(builder.Environment);
        services.AddScoped<IFileStorage, MediaServiceStorage>();

        services.AddScoped<InstagramApiClient>();
        services.AddScoped<InstagramUrlBuilder>();
        services.AddScoped<InstagramPayloadBuilder>();
        services.AddScoped<InstagramHeaderBuilder>();
        services.AddScoped<IInstagramIntegrationService, InstagramIntegrationService>();

        services.AddScoped<IPublicationStatusNotifier, PublicationStatusNotifier>();

        // TODO: should be in Application layer --- IGNORE ---
        // services.AddScoped<IAccountPickerFactory, AccountPickerFactory>();
        services.AddScoped<ISocialMediaPublisherFactory, SocialMediaPublisherFactory>();

        services.AddScoped<AutoListEntryRetriever>();
        services.AddSingleton(TimeProvider.System);

        services.AddHostedService<AutoListSchedulerWorker>();

        services.AddPollyPipelines();
        services.AddCustomHttpClients(builder.Configuration);
        services.AddBrokerConnection();

        builder.AddSchedulerServices();
    }

    private static void AddInfrastructureOptionsWithFluentValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddOptionsWithFluentValidation<DbConnectionOptions>(DbConnectionOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<MediaServiceOptions>(MediaServiceOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<InstagramApiOptions>(InstagramApiOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<PublisherOptions>(PublisherOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<JwtOptions>(JwtOptions.ConfigurationSection);
    }

    private static void AddDatabaseConnection(this IHostApplicationBuilder builder)
    {
        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDataProtection()
            .PersistKeysToDbContext<ApplicationDbContext>()
            .SetApplicationName("AmplifyPublisherApp");

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var dbOptions = sp.GetRequiredService<IOptions<DbConnectionOptions>>().Value;

            var dataSourceBuilder = new NpgsqlDataSourceBuilder(dbOptions.Default);
            dataSourceBuilder
                .MapEnum<SocialProvider>()
                .MapEnum<PublicationStatus>();
            var dataSource = dataSourceBuilder.Build();

            options.UseNpgsql(
                dataSource,
                o => o
                    .MapEnum<SocialProvider>(schemaName: ApplicationDbContext.DefaultSchemaName)
                    .MapEnum<PublicationStatus>(schemaName: ApplicationDbContext.DefaultSchemaName)
                    .EnableRetryOnFailure(4)
                    .MigrationsHistoryTable("__EFMigrationsHistory", ApplicationDbContext.DefaultSchemaName)
            );

            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
        });

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        builder.Services.AddScoped<ApplicationDbContextInitialiser>();
    }

    private static IServiceCollection AddPublishers(this IServiceCollection services, IHostEnvironment environment)
    {
        services.AddScoped<IPublicationService, PublicationService>();
        if (environment.IsDevelopment())
        {
            services.AddScoped<ISocialMediaPublisher, DummyInstagramPublisher>();
        }
        else
        {
            services.AddScoped<ISocialMediaPublisher, InstagramPublisher>();
        }

        return services;
    }


    private static IServiceCollection AddPollyPipelines(this IServiceCollection services)
    {
        services.AddResiliencePipeline<string, InstagramApiResponse>(Pipelines.InstagramContainerStatusCheckPipelineName, static (builder, context) =>
        {
            builder.AddRetry(new RetryStrategyOptions<InstagramApiResponse>
            {
                MaxRetryAttempts = ContainerStatusQuery.MaxAttempts,
                Delay = TimeSpan.FromMilliseconds(ContainerStatusQuery.DelayMs),
                ShouldHandle = new PredicateBuilder<InstagramApiResponse>()
                    .HandleResult(response => response.StatusCode == UploadStatus.InProgress),
                OnRetry = args =>
                {
                    var logger = context.ServiceProvider.GetService<ILogger>();
                    logger?.LogInformation("Retry attempt {Attempt} for container upload", args.AttemptNumber);
                    return ValueTask.CompletedTask;
                }
            });
        });

        return services;
    }

    private static IServiceCollection AddBrokerConnection(this IServiceCollection services)
    {
        services.AddMassTransit(config =>
        {
            config.AddConsumer<PublishRequestedConsumer>();
            // TODO: probably should have smth like projected created

            config.SetSnakeCaseEndpointNameFormatter();


            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Host, h =>
                {
                    h.Username(options.Username);
                    h.Password(options.Password);
                });

                // TODO: Decide whether we start publishing based on event or direct api trigger
                // cfg.Message<PostCreated>(x => x.SetEntityName("post-created"));

                cfg.UseInMemoryOutbox(context);

                cfg.ConfigureEndpoints(context);
            });
        });

        return services;
    }

    private static IHostApplicationBuilder AddAuth(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        var configuration = builder.Configuration;

        var jwtOptions = new JwtOptions()
        {
            Issuer = "",
            Audience = ""
        };

        configuration.GetSection(JwtOptions.ConfigurationSection).Bind(jwtOptions);

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

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

        return builder;
    }
}


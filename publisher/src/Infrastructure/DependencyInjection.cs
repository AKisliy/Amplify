using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Options;
using Publisher.Infrastructure;
using Publisher.Infrastructure.Data;
using Publisher.Infrastructure.Data.Interceptors;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Hosting;
using Publisher.Infrastructure.Storage;
using FluentValidation;
using System.Reflection;
using Publisher.Infrastructure.Configuration.Options;
using Microsoft.AspNetCore.DataProtection;
using Npgsql;
using Publisher.Domain.Enums;
using Polly;
using Publisher.Infrastructure.Models.Instagram;
using Publisher.Infrastructure.Constants;
using Polly.Retry;
using static Publisher.Infrastructure.Constants.InstagramApi;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Infrastructure.Factory;
using Publisher.Infrastructure.Scheduler;
using Publisher.Infrastructure.Scheduler.BackgroundJobs;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Publisher.Infrastructure.Auth;
using Publisher.Infrastructure.Broker;
using Microsoft.EntityFrameworkCore.Migrations;
using Publisher.Infrastructure.Publishers;

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

        if (builder.Environment.IsDevelopment())
        {
            builder.Services.AddCors(options => options.AddPolicy("Dev",
                p => p.WithOrigins("http://localhost:3000")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()));
        }

        services.AddScoped<IPublicationStatusNotifier, PublicationStatusNotifier>();
        services.AddScoped<IPublicationService, PublicationService>();

        services.AddScoped<ISocialMediaPublisherFactory, SocialMediaPublisherFactory>();
        services.AddScoped<IConnectionServiceFactory, ConnectionServiceFactory>();

        services.AddScoped<AutoListEntryRetriever>();
        services.AddSingleton(TimeProvider.System);

        services.AddPollyPipelines();
        services.AddBrokerConnection();

        builder.AddSchedulerServices();

        builder.AddSocialMediaConnections();
        builder.AddHttpClients();
    }

    private static void AddInfrastructureOptionsWithFluentValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddOptionsWithFluentValidation<InstagramApiOptions>(InstagramApiOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<PublisherOptions>(PublisherOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<JwtOptions>(JwtOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<CorsOptions>(CorsOptions.SectionName);
        services.AddOptionsWithFluentValidation<TikTokApiOptions>(TikTokApiOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<FrontendOptions>(FrontendOptions.ConfigurationSection);
    }

    private static void AddDatabaseConnection(this IHostApplicationBuilder builder)
    {
        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDataProtection()
            .PersistKeysToDbContext<ApplicationDbContext>()
            .SetApplicationName("AmplifyPublisherApp");

        var connectionString = builder.Configuration.GetConnectionString("Default");
        Guard.Against.Null(connectionString, message: "Connection string 'Default' not found");

        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        connectionString = connectionBuilder.ToString();

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
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
                    .MigrationsHistoryTable(HistoryRepository.DefaultTableName, ApplicationDbContext.DefaultSchemaName)
            );

            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
        });

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        builder.Services.AddScoped<ApplicationDbContextInitialiser>();
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

    private static void AddSocialMediaConnections(this IHostApplicationBuilder builder)
    {
        builder.AddInstagramConnection();
        builder.AddTikTokConnection();
    }

    private static void AddHttpClients(this IHostApplicationBuilder builder)
    {
        var options = new ExternalUrlsOptions();
        builder.Configuration.GetSection(ExternalUrlsOptions.SectionName).Bind(options);

        builder.Services.AddHttpClient<IFileStorage, MediaServiceStorage>(client =>
        {
            client.BaseAddress = new Uri(options.MediaServiceApi);
        });

        builder.Services.AddHttpClient<ImportAvatarJob>(client => client.BaseAddress = new Uri(options.MediaServiceApi));
    }
}


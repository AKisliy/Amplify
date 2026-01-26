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

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        services.AddInfrastructureOptionsWithFluentValidation();

        builder.AddDatabaseConnection();

        services.AddScoped<IFileStorage, MediaServiceStorage>();

        services.AddScoped<InstagramApiClient>();
        services.AddScoped<InstagramUrlBuilder>();
        services.AddScoped<InstagramPayloadBuilder>();
        services.AddScoped<InstagramHeaderBuilder>();
        services.AddScoped<IInstagramIntegrationService, InstagramIntegrationService>();

        // TODO: should be in Application layer --- IGNORE ---
        // services.AddScoped<IAccountPickerFactory, AccountPickerFactory>();
        services.AddScoped<ISocialMediaPublisherFactory, SocialMediaPublisherFactory>();

        services.AddScoped<AutoListEntryRetriever>();
        services.AddSingleton(TimeProvider.System);

        services.AddHostedService<AutoListSchedulerWorker>();

        services.AddPollyPipelines();
        services.AddCustomHttpClients(builder.Configuration);
        services.AddBrokerConnection();
    }

    private static void AddInfrastructureOptionsWithFluentValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddOptionsWithFluentValidation<DbConnectionOptions>(DbConnectionOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<MediaServiceOptions>(MediaServiceOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<InstagramApiOptions>(InstagramApiOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);
    }

    private static void AddDatabaseConnection(this IHostApplicationBuilder builder)
    {
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
                    .MapEnum<SocialProvider>()
                    .MapEnum<PublicationStatus>()
                    .EnableRetryOnFailure(4)
            );
            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
        });

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
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
}


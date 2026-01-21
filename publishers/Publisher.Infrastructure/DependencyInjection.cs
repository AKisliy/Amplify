using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Interfaces.Instagram;
using Publisher.Core.Enums;
using Publisher.Infrastructure.Factory;
using Publisher.Infrastructure.Instagram;
using Publisher.Infrastructure.Security;
using Publisher.Infrastructure.Storage;
using Polly;
using Publisher.Application.Common.Models.Instagram;
using Publisher.Core.Constants;
using Polly.Retry;
using static Publisher.Core.Constants.InstagramApi;
using Microsoft.Extensions.Logging;
using Publisher.Infrastructure.Data;
using Microsoft.Extensions.Options;
using Publisher.Application.Common.Options;
using Publisher.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Publisher.Infrastructure.Data.Interceptors;
using Publisher.Infrastructure.Workers;
using MassTransit;
using Publisher.Application.Publisher;
using Publisher.Application.CreatedPosts.EventHandlers;
using Publisher.Application.PostContainers.EventHandlers;
using Publisher.Contracts.Events;
using Minio;
using Microsoft.Extensions.Configuration;
using System.Reflection;
using FluentValidation;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Configuration;
using Microsoft.AspNetCore.DataProtection;

namespace Publisher.Infrastructure;

public static class DependencyInjection
{
    public static void AddInfrastucture(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        services.AddInfrastructureOptionsWithFluentValidation();

        builder.AddDatabaseConnection();

        services.AddTransient<ITokenProtector, TokenProtector>();
        services.AddScoped<IFileStorage, LocalFileStorage>();

        services.AddScoped<IInstagramApiClient, InstagramApiClient>();
        services.AddScoped<IInstagramUrlBuilder, InstagramUrlBuilder>();
        services.AddScoped<IInstagramPayloadBuilder, InstagramPayloadBuilder>();
        services.AddScoped<IInstagramHeaderBuilder, InstagramHeaderBuilder>();
        services.AddScoped<IInstagramIntegrationService, InstagramIntegrationService>();

        services.AddScoped<IAccountPickerFactory, AccountPickerFactory>();
        services.AddScoped<ISocialMediaPublisherFactory, SocialMediaPublisherFactory>();

        services.AddScoped<IAutoListEntryRetriever, AutoListEntryRetriever>();
        services.AddSingleton(TimeProvider.System);

        services.AddHostedService<AutoListSchedulerWorker>();

        services.AddPollyPipelines();
        services.AddCustomHttpClients(builder.Configuration);
        services.AddBrokerConnection();
        services.AddS3Storage(builder.Configuration);
    }

    private static void AddInfrastructureOptionsWithFluentValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddOptionsWithFluentValidation<DbConnectionOptions>(DbConnectionOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<S3Options>(S3Options.ConfigurationSection);
        services.AddOptionsWithFluentValidation<InstagramApiOptions>(InstagramApiOptions.ConfigurationSection);
    }

    private static void AddDatabaseConnection(this IHostApplicationBuilder builder)
    {
        builder.Services.AddDataProtection()
            .PersistKeysToDbContext<PublisherDbContext>()
            .SetApplicationName("AmplifyPublisherApp");

        builder.Services.AddDbContext<PublisherDbContext>((sp, options) =>
        {
            var dbOptions = sp.GetRequiredService<IOptions<DbConnectionOptions>>().Value;

            var dataSourceBuilder = new NpgsqlDataSourceBuilder(dbOptions.Default);
            dataSourceBuilder
                .MapEnum<VideoFormat>()
                .MapEnum<SocialMedia>()
                .MapEnum<PublicationStatus>();
            var dataSource = dataSourceBuilder.Build();

            options.UseNpgsql(
                dataSource,
                o => o
                    .MapEnum<VideoFormat>()
                    .MapEnum<SocialMedia>()
                    .MapEnum<PublicationStatus>()
                    .EnableRetryOnFailure(4)
            );
            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
        });

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<PublisherDbContext>());
        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<PublisherDbContextInitialiser>();
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
            config.AddConsumer<PostCreatedHandler>();
            config.AddConsumer<PostContainerCreatedHandler>();

            config.SetSnakeCaseEndpointNameFormatter();


            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Host, h =>
                {
                    h.Username(options.Username);
                    h.Password(options.Password);
                });

                cfg.Message<PostCreated>(x => x.SetEntityName("post-created"));

                cfg.UseInMemoryOutbox(context);

                cfg.ConfigureEndpoints(context);
            });
        });

        return services;
    }

    private static IServiceCollection AddS3Storage(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetRequiredSection(S3Options.ConfigurationSection).Get<S3Options>()!;

        services.AddMinio(configureClient => configureClient
            .WithEndpoint(options.Host)
            .WithCredentials(options.AccessKey, options.SecretKey)
            .Build()
        );

        return services;
    }
}

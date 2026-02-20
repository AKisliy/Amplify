using System.Reflection;
using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Application.Common.Options;
using MediaIngest.Application.Media.Commands.Upload;
using MediaIngest.Domain.Enums;
using MediaIngest.Infrastructure.Configuration;
using MediaIngest.Infrastructure.Data;
using MediaIngest.Infrastructure.Data.Interceptors;
using MediaIngest.Infrastructure.FileStorage;
using MediaIngest.Infrastructure.MediaLinkResolvers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Minio;
using Npgsql;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        builder.Services.AddInfrastructureOptions();

        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddApplicationDb();

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        builder.Services.AddSingleton(TimeProvider.System);

        builder.Services.AddScoped<IMediaLinkResolverFactory, MediaLinkResolverFactory>();
        builder.Services.AddScoped<IMediaLinkResolver, InstagramLinkResolver>();
        builder.Services.AddScoped<IMediaLinkResolver, PinterestLinkResolver>();

        builder.Services.AddS3Storage(builder.Configuration);
        builder.Services.AddScoped<IFileStorage, S3Storage>();

        builder.Services.AddHttpClients();
    }

    private static void AddApplicationDb(this IServiceCollection services)
    {
        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var dbOptions = sp.GetRequiredService<IOptions<DbConnectionOptions>>().Value;

            var dataSourceBuilder = new NpgsqlDataSourceBuilder(dbOptions.Default);
            dataSourceBuilder
                .MapEnum<FileType>()
                .MapEnum<MediaType>();
            var dataSource = dataSourceBuilder.Build();

            options.UseNpgsql(
                dataSource,
                o => o
                    .MapEnum<FileType>()
                    .MapEnum<MediaType>()
                    .EnableRetryOnFailure(4)
                    .MigrationsHistoryTable(HistoryRepository.DefaultTableName, ApplicationDbContext.DefaultSchemaName)
                );
            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseNpgsql(dbOptions.Default);
        });

        services.AddScoped<ApplicationDbContextInitialiser>();
    }

    private static void AddInfrastructureOptions(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddOptionsWithFluentValidation<S3Options>(S3Options.ConfigurationSection);
        services.AddOptionsWithFluentValidation<YtDlpOptions>(YtDlpOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<DbConnectionOptions>(DbConnectionOptions.ConfigurationSection);
    }

    private static void AddHttpClients(this IServiceCollection services)
    {
        services.AddHttpClient<UploadFromLinkCommandHandler>();
    }

    private static IServiceCollection AddS3Storage(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetRequiredSection(S3Options.ConfigurationSection).Get<S3Options>()!;

        services.AddMinio(configureClient => configureClient
            .WithEndpoint(options.Host)
            .WithCredentials(options.AccessKey, options.SecretKey)
            .WithSSL(options.UseSsl)
            .Build()
        );

        return services;
    }
}

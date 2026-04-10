using Hangfire;
using Hangfire.PostgreSql;
using MediaIngest.Infrastructure.Scheduler.BackgroundJobs;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace MediaIngest.Infrastructure.Hangfire;

internal static class ServiceCollectionExtensions
{
    private const string SchedulerConnectionStringName = "Hangfire";
    private const string HangfireSchemaName = "media_ingest_hangfire";

    internal static IHostApplicationBuilder AddScheduler(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString(SchedulerConnectionStringName);

        Guard.Against.NullOrEmpty(connectionString, nameof(connectionString), $"Connection string '{SchedulerConnectionStringName}' is not configured.");

        builder.Services.AddHangfire(config =>
        {
            config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(() => connectionString), new PostgreSqlStorageOptions
                {
                    SchemaName = HangfireSchemaName,
                    PrepareSchemaIfNecessary = true
                });
        });
        builder.Services.AddHangfireServer();

        builder.Services.AddHostedService<BackgroundJobsBootstrapper>();

        return builder;
    }

    internal static IApplicationBuilder UseScheduler(this IApplicationBuilder app)
    {
        app.UseHangfireDashboard("/hangfire");
        return app;
    }
}

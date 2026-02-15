using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Publisher.Infrastructure.Scheduler;

internal static class ServiceCollectionExtensions
{
    private const string SchedulerSchemaName = "publisher_hangfire";

    public static IHostApplicationBuilder AddSchedulerServices(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("Default");
        Guard.Against.NullOrEmpty(connectionString);

        builder.Services.AddHangfire((provider, config) =>
        {
            config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(() => connectionString), new PostgreSqlStorageOptions
                {
                    SchemaName = SchedulerSchemaName,
                    PrepareSchemaIfNecessary = true
                });
        });

        builder.Services.AddHangfireServer();

        return builder;
    }

    public static IApplicationBuilder UseScheduler(this IApplicationBuilder builder)
    {
        builder.UseHangfireDashboard(options: new DashboardOptions
        {
            Authorization = [new Filters.AllowAllAuthorizationFilter()]
        });

        return builder;
    }
}

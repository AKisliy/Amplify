using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Publisher.Infrastructure.Configuration.Options;

namespace Publisher.Infrastructure.Scheduler;

internal static class ServiceCollectionExtensions
{
    public static IHostApplicationBuilder AddSchedulerServices(this IHostApplicationBuilder builder)
    {
        builder.Services.AddHangfire((provider, config) =>
        {
            var options = provider.GetRequiredService<IOptions<DbConnectionOptions>>().Value;
            config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(() => options.Default), new PostgreSqlStorageOptions
                {
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

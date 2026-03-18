using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using UserService.Infrastructure.Data.Interceptors;
using Microsoft.EntityFrameworkCore.Migrations;
using UserService.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Npgsql;
using UserService.Domain.Enums;
using Npgsql.EntityFrameworkCore.PostgreSQL.Infrastructure;

namespace UserService.Infrastructure.Data;

internal static class DependencyInjection
{
    public static IHostApplicationBuilder AddPersistence(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("UserServiceDb");
        Guard.Against.Null(connectionString, message: "Connection string 'UserServiceDb' not found.");

        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        connectionString = connectionBuilder.ToString();

        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDataProtection()
            .PersistKeysToDbContext<ApplicationDbContext>()
            .SetApplicationName("AmplifyUserService");

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
            dataSourceBuilder.MapApplicationEnums();

            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseNpgsql(
                connectionString,
                npgsqlOptions =>
                    npgsqlOptions
                    .MapApplicationEnums()
                    .MigrationsHistoryTable(HistoryRepository.DefaultTableName, ApplicationDbContext.DefaultSchemaName));
            options.UseSnakeCaseNamingConvention();
            options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
        });

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        builder.Services.AddScoped<ApplicationDbContextInitialiser>();

        return builder;
    }

    private static NpgsqlDataSourceBuilder MapApplicationEnums(this NpgsqlDataSourceBuilder builder)
    {
        builder.MapEnum<AssetLifetime>();

        return builder;
    }

    private static NpgsqlDbContextOptionsBuilder MapApplicationEnums(this NpgsqlDbContextOptionsBuilder builder)
    {
        builder.MapEnum<AssetLifetime>(schemaName: ApplicationDbContext.DefaultSchemaName);

        return builder;
    }
}

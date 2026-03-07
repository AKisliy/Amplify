using FluentValidation;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using Publisher.Application.Common.Interfaces;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Clients.TikTok;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Data;
using Shouldly;

namespace Publisher.Infrastructure.IntegrationTests.Connections;

[TestFixture]
[Category("Integration")]
public class TikTokTokenRefreshTests
{
    private static readonly Guid AccountId = Guid.Parse("019cc7a4-8fbe-72ae-8737-ac087da020db");

    private ServiceProvider _serviceProvider = null!;

    [OneTimeSetUp]
    public void SetUp()
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var services = new ServiceCollection();

        services.AddLogging(b => b.AddConsole());

        services.AddDataProtection()
            .PersistKeysToDbContext<ApplicationDbContext>()
            .SetApplicationName("AmplifyPublisherApp");

        var connectionString = config.GetConnectionString("Default")!;
        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
            dataSourceBuilder.MapEnum<SocialProvider>();
            var dataSource = dataSourceBuilder.Build();

            options.UseNpgsql(
                dataSource,
                o => o
                    .MapEnum<SocialProvider>(schemaName: ApplicationDbContext.DefaultSchemaName)
                    .EnableRetryOnFailure(4)
                    .MigrationsHistoryTable(HistoryRepository.DefaultTableName, ApplicationDbContext.DefaultSchemaName)
            );
            options.UseSnakeCaseNamingConvention();
        });
        services.AddScoped<IApplicationDbContext>(p => p.GetRequiredService<ApplicationDbContext>());
        services.AddValidatorsFromAssembly(typeof(TikTokConnectionService).Assembly);

        services.Configure<TikTokApiOptions>(config.GetSection(TikTokApiOptions.ConfigurationSection));
        services.Configure<FrontendOptions>(config.GetSection(FrontendOptions.ConfigurationSection));
        services.AddHttpClient<TikTokApiClient>(c => c.Timeout = TimeSpan.FromSeconds(30));
        services.AddScoped<TikTokApiClient>();
        services.AddScoped<TikTokConnectionService>();

        _serviceProvider = services.BuildServiceProvider();
    }

    [OneTimeTearDown]
    public async Task TearDown()
    {
        await _serviceProvider.DisposeAsync();
    }

    [Test, Explicit("Hits real TikTok API and database — run manually")]
    public async Task RefreshAccessToken_ForExistingAccount_UpdatesTokenAndExpiry()
    {
        using var scope = _serviceProvider.CreateScope();
        var sp = scope.ServiceProvider;

        var dbContext = sp.GetRequiredService<ApplicationDbContext>();
        var connectionService = sp.GetRequiredService<TikTokConnectionService>();

        var account = await dbContext.SocialAccounts
            .FirstOrDefaultAsync(a => a.Id == AccountId);

        account.ShouldNotBeNull($"Account {AccountId} not found in database");

        var expiryBefore = account!.TokenExpiresAt;

        await connectionService.RefreshAccessTokenAsync(account);

        account.TokenExpiresAt.ShouldBeGreaterThan(expiryBefore);

        await dbContext.Entry(account).ReloadAsync();
        account.TokenExpiresAt.ShouldBeGreaterThan(expiryBefore);
    }
}

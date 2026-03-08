using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Infrastructure.Clients.Instagram;
using Publisher.Application.Common.Options;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Data;
using Shouldly;
using Polly;
using Publisher.Infrastructure.Models.Instagram;
using Publisher.Infrastructure.Constants;
using Polly.Retry;
using static Publisher.Infrastructure.Constants.InstagramApi;
using Npgsql;
using Publisher.Domain.Enums;

namespace Publisher.Infrastructure.IntegrationTests.Connections;

[TestFixture]
[Category("Integration")]
public class InstagramTokenRefreshTests
{
    private static readonly Guid AccountId = Guid.Parse("019cc786-1cf9-7605-b34a-ad22c51bef3e");

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

        // Data Protection — must match production app name to decrypt stored credentials
        services.AddDataProtection()
            .PersistKeysToDbContext<ApplicationDbContext>()
            .SetApplicationName("AmplifyPublisherApp");

        // DB
        var connectionString = config.GetConnectionString("Default")!;
        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
            dataSourceBuilder
                .MapEnum<SocialProvider>();
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

        // Instagram dependencies
        services.Configure<InstagramApiOptions>(config.GetSection(InstagramApiOptions.ConfigurationSection));
        services.Configure<FrontendOptions>(config.GetSection(FrontendOptions.ConfigurationSection));
        services.AddScoped<InstagramUrlBuilder>();
        services.AddScoped<InstagramPayloadBuilder>();
        services.AddScoped<InstagramHeaderBuilder>();
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
        services.AddHttpClient<InstagramApiClient>(c => c.Timeout = TimeSpan.FromSeconds(30))
            .AddStandardResilienceHandler();
        services.AddScoped<InstagramConnectionService>();

        _serviceProvider = services.BuildServiceProvider();
    }

    [OneTimeTearDown]
    public async Task TearDown()
    {
        await _serviceProvider.DisposeAsync();
    }

    [Test, Explicit("Hits real Instagram API and database — run manually")]
    public async Task RefreshAccessToken_ForExistingAccount_UpdatesTokenAndExpiry()
    {
        using var scope = _serviceProvider.CreateScope();
        var sp = scope.ServiceProvider;

        var dbContext = sp.GetRequiredService<ApplicationDbContext>();
        var connectionService = sp.GetRequiredService<InstagramConnectionService>();

        var account = await dbContext.SocialAccounts
            .FirstOrDefaultAsync(a => a.Id == AccountId);

        account.ShouldNotBeNull($"Account {AccountId} not found in database");

        var expiryBefore = account!.TokenExpiresAt;

        await connectionService.RefreshAccessTokenAsync(account);

        // Token expiry should be extended
        account.TokenExpiresAt.ShouldBeGreaterThan(expiryBefore);

        // Verify it was actually persisted — reload from DB
        await dbContext.Entry(account).ReloadAsync();
        account.TokenExpiresAt.ShouldBeGreaterThan(expiryBefore);
    }
}

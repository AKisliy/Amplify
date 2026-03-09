using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Npgsql;
using Polly;
using Polly.Retry;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Models;
using Publisher.Domain.Entities.PublicationSetup;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Clients.Instagram;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Constants;
using Publisher.Infrastructure.Data;
using Publisher.Infrastructure.Models.Instagram;
using Publisher.Infrastructure.Publishers;
using Shouldly;
using static Publisher.Infrastructure.Constants.InstagramApi;

namespace Publisher.Infrastructure.IntegrationTests.Publishing;

[TestFixture]
[Category("Integration")]
public class InstagramPublisherTests
{
    private static readonly Guid AccountId = Guid.Parse("019cccb6-5e96-7853-94d4-83227a653c58");
    private const string TestVideoUrl = "https://media.alexeykiselev.tech/test.mp4";

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

        // IFileStorage mock — returns hardcoded video URL, ignores cover
        var fileStorageMock = new Mock<IFileStorage>();
        fileStorageMock
            .Setup(f => f.GetPublicUrlAsync(It.IsAny<Guid>()))
            .ReturnsAsync(TestVideoUrl);
        services.AddSingleton(fileStorageMock.Object);

        // Instagram dependencies
        services.Configure<InstagramApiOptions>(config.GetSection(InstagramApiOptions.ConfigurationSection));
        services.AddScoped<InstagramUrlBuilder>();
        services.AddScoped<InstagramPayloadBuilder>();
        services.AddResiliencePipeline<string, InstagramApiResponse>(
            Pipelines.InstagramContainerStatusCheckPipelineName,
            static (builder, context) =>
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
                        logger?.LogInformation("Waiting for container upload, attempt {Attempt}", args.AttemptNumber);
                        return ValueTask.CompletedTask;
                    }
                });
            });
        services.AddHttpClient<InstagramApiClient>(c => c.Timeout = TimeSpan.FromMinutes(5))
            .AddStandardResilienceHandler();

        services.AddScoped<InstagramPublisher>();

        _serviceProvider = services.BuildServiceProvider();
    }

    [OneTimeTearDown]
    public async Task TearDown()
    {
        await _serviceProvider.DisposeAsync();
    }

    [Test, Explicit("Hits real Instagram API and database — run manually")]
    public async Task PostVideoAsync_WithValidAccount_PublishesReelAndReturnsLink()
    {
        using var scope = _serviceProvider.CreateScope();
        var sp = scope.ServiceProvider;

        var publisher = sp.GetRequiredService<InstagramPublisher>();

        var postConfig = new SocialMediaPostConfig(
            PostFileId: Guid.NewGuid(), // mocked — fileStorage returns TestVideoUrl regardless
            Description: "Integration test reel",
            CoverFileId: null,
            AccountId: AccountId,
            PublicationSettings: new PublicationSettings
            {
                Instagram = new InstagramSettings { ShareToFeed = true }
            });

        var result = await publisher.PostVideoAsync(postConfig, CancellationToken.None);

        result.ShouldNotBeNull();
        result.Status.ShouldBe(PublicationStatus.Published);
        result.PublicUrl.ShouldNotBeNullOrEmpty();
        result.PublicUrl.ShouldContain("instagram.com");
    }
}

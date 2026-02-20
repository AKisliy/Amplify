using Azure.Identity;
using MediaIngest.Infrastructure.Configuration;
using MediaIngest.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using NSwag;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddWebServices(this IHostApplicationBuilder builder)
    {
        builder.Services.AddDatabaseDeveloperPageExceptionFilter();

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddHealthChecks()
            .AddDbContextCheck<ApplicationDbContext>();

        builder.Services.AddExceptionHandler<CustomExceptionHandler>();


        // Customise default API behaviour
        builder.Services.Configure<ApiBehaviorOptions>(options =>
            options.SuppressModelStateInvalidFilter = true);

        builder.Services.AddEndpointsApiExplorer();

        var mediaIngestOptions = new MediaIngestOptions();
        builder.Configuration.GetSection(MediaIngestOptions.SectionName).Bind(mediaIngestOptions);

        builder.Services.AddOpenApiDocument((configure, sp) =>
        {
            configure.Title = "MediaIngest API";

            configure.PostProcess = document =>
            {
                document.Servers.Clear();
                document.Servers.Add(new OpenApiServer
                {
                    Url = string.IsNullOrEmpty(mediaIngestOptions.BasePath) ? "/" : mediaIngestOptions.BasePath,
                    Description = "Media-ingest API"
                });
            };
        });

        builder.Services.AddOpenApi();
    }

    public static void AddKeyVaultIfConfigured(this IHostApplicationBuilder builder)
    {
        var keyVaultUri = builder.Configuration["AZURE_KEY_VAULT_ENDPOINT"];
        if (!string.IsNullOrWhiteSpace(keyVaultUri))
        {
            builder.Configuration.AddAzureKeyVault(
                new Uri(keyVaultUri),
                new DefaultAzureCredential());
        }
    }
}

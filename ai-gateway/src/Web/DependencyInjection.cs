using System.Reflection;
using System.Text.Json.Serialization;
using AiGateway.Web.Clients;
using AiGateway.Web.Configuration;
using AiGateway.Web.Configuration.Extensions;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddOptionsWithFluentValidation<OpenAiOptions>(OpenAiOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<MediaIngestOptions>(MediaIngestOptions.ConfigurationSection);

        services.AddSingleton<OpenAiTranscriptionClient>();
        services.AddHttpClient();
    }

    public static void AddWebServices(this IHostApplicationBuilder builder)
    {
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddHealthChecks();

        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

        builder.Services.AddEndpointsApiExplorer();

        builder.Services.AddSwaggerGen();
    }
}

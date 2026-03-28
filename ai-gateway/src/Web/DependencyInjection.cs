using System.Reflection;
using System.Text.Json.Serialization;
using AiGateway.Web.Clients.ElevenLabs;
using AiGateway.Web.Clients.MediaIngest;
using AiGateway.Web.Clients.OpenAi;
using AiGateway.Web.Configuration;
using AiGateway.Web.Configuration.Extensions;
using AiGateway.Web.Services;
using Microsoft.Kiota.Abstractions;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using Microsoft.Kiota.Serialization.Form;
using Microsoft.Kiota.Serialization.Json;
using Microsoft.Kiota.Serialization.Multipart;
using Microsoft.Kiota.Serialization.Text;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddElevenLabs();
        services.AddOpenAi();
        services.AddMediaIngest();
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

    private static IServiceCollection AddElevenLabs(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<ElevenlabsOptions>(ElevenlabsOptions.ConfigurationSection);

        ApiClientBuilder.RegisterDefaultSerializer<JsonSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultSerializer<TextSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultSerializer<FormSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultSerializer<MultipartSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultDeserializer<JsonParseNodeFactory>();
        ApiClientBuilder.RegisterDefaultDeserializer<TextParseNodeFactory>();
        ApiClientBuilder.RegisterDefaultDeserializer<FormParseNodeFactory>();

        services.AddHttpClient("elevenlabs", (sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<ElevenlabsOptions>>().Value;
            client.DefaultRequestHeaders.Add("xi-api-key", options.ApiKey);
            client.Timeout = TimeSpan.FromSeconds(300);
        });

        services.AddTransient(sp =>
        {
            var options = sp.GetRequiredService<IOptions<ElevenlabsOptions>>().Value;
            var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("elevenlabs");
            var adapter = new HttpClientRequestAdapter(new AnonymousAuthenticationProvider(), httpClient: httpClient)
            {
                BaseUrl = options.BaseUrl
            };
            return new ElevenLabsClient(adapter);
        });

        services.AddScoped<ElevenLabsService>();
        return services;
    }

    private static IServiceCollection AddOpenAi(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<OpenAiOptions>(OpenAiOptions.ConfigurationSection);

        services.AddScoped<OpenAiService>();
        services.AddScoped<OpenAiTranscriptionClient>();
        return services;
    }

    private static IServiceCollection AddMediaIngest(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<MediaIngestOptions>(MediaIngestOptions.ConfigurationSection);

        services.AddHttpClient("mediaingest");
        services.AddTransient(sp =>
        {
            var options = sp.GetRequiredService<IOptions<MediaIngestOptions>>().Value;
            var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("mediaingest");
            var adapter = new HttpClientRequestAdapter(new AnonymousAuthenticationProvider(), httpClient: httpClient)
            {
                BaseUrl = options.BaseUrl
            };
            return new MediaIngestClient(adapter);
        });
        services.AddScoped<MediaIngestService>();

        return services;
    }
}

using System.Reflection;
using System.Text.Json.Serialization;
using AiGateway.Web.Clients;
using AiGateway.Web.Clients.ElevenLabs;
using AiGateway.Web.Configuration;
using AiGateway.Web.Configuration.Extensions;
using Microsoft.Kiota.Abstractions;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Abstractions.Serialization;
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

        services.AddOptionsWithFluentValidation<OpenAiOptions>(OpenAiOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<ElevenlabsOptions>(ElevenlabsOptions.ConfigurationSection);
        services.AddOptionsWithFluentValidation<MediaIngestOptions>(MediaIngestOptions.ConfigurationSection);


        services.AddHttpClient("elevenlabs", (sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<ElevenlabsOptions>>().Value;
            client.DefaultRequestHeaders.Add("xi-api-key", options.ApiKey);
        });
        ApiClientBuilder.RegisterDefaultSerializer<JsonSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultSerializer<TextSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultSerializer<FormSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultSerializer<MultipartSerializationWriterFactory>();
        ApiClientBuilder.RegisterDefaultDeserializer<JsonParseNodeFactory>();
        ApiClientBuilder.RegisterDefaultDeserializer<TextParseNodeFactory>();
        ApiClientBuilder.RegisterDefaultDeserializer<FormParseNodeFactory>();

        services.AddTransient(sp =>
        {
            var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("elevenlabs");
            var adapter = new HttpClientRequestAdapter(new AnonymousAuthenticationProvider(), httpClient: httpClient);
            adapter.BaseUrl = "https://api.elevenlabs.io";
            return new ElevenLabsClient(adapter);
        });
        services.AddScoped<ElevenLabsService>();

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

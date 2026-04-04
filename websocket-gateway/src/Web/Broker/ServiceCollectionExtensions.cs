using MassTransit;
using Microsoft.Extensions.Options;
using WebSocketGateway.Contracts.Publisher;
using WebSocketGateway.Contracts.TemplateService;
using WebSocketGateway.Contracts.UserService;
using WebSocketGateway.Contracts.VideoEditor;
using WebSocketGateway.Web.Configuration;
using WebSocketGateway.Web.Consumers;

namespace WebSocketGateway.Web.Broker;

internal static class ServiceCollectionExtensions
{
    internal static IHostApplicationBuilder AddBroker(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.AddMassTransit(config =>
        {
            // TODO: fix to auto-scan all consumers from assembly
            config.AddConsumer<PublicationStatusChangedConsumer>();
            config.AddConsumer<VideoEditingStepChangedConsumer>();
            config.AddConsumer<NodeExecutionStatusChangedConsumer>();
            config.AddConsumer<GraphCompletedConsumer>();
            config.AddConsumer<AssetRegisteredConsumer>();

            config.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter(includeNamespace: false));

            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Url);
                cfg.Message<PublicationStatusChanged>(x => x.SetEntityName("publication-status-changed"));
                cfg.Message<VideoEditingStepChanged>(x => x.SetEntityName("video-editing-step-changed"));
                cfg.Message<NodeExecutionStatusChanged>(x => x.SetEntityName("node-status-changed"));
                cfg.Message<GraphCompleted>(x => x.SetEntityName("graph-completed"));
                cfg.Message<AssetRegistered>(x => x.SetEntityName("asset-registered"));

                cfg.UseRawJsonSerializer(RawSerializerOptions.AnyMessageType, isDefault: true);

                cfg.UseInMemoryOutbox(context);

                cfg.ConfigureEndpoints(context);
            });
        });

        return builder;
    }
}

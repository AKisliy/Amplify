using MassTransit;
using Microsoft.Extensions.Options;
using WebSocketGateway.Contracts.Publisher;
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

            config.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter(includeNamespace: false));

            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Url);
                // cfg.Host(options.Host, h =>
                // {
                //     h.Username(options.Username);
                //     h.Password(options.Password);
                // });
                cfg.Message<PublicationStatusChanged>(x => x.SetEntityName("publication-status-changed"));
                cfg.Message<VideoEditingStepChanged>(x => x.SetEntityName("video-editing-step-changed"));

                cfg.UseRawJsonSerializer(RawSerializerOptions.AnyMessageType, isDefault: true);

                cfg.UseInMemoryOutbox(context);

                cfg.ConfigureEndpoints(context);
            });
        });

        return builder;
    }
}

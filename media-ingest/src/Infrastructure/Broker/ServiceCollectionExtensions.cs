using Contracts;
using MassTransit;
using MediaIngest.Infrastructure.Configuration;
using MediaIngest.Infrastructure.Consumers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace MediaIngest.Infrastructure.Broker;

internal static class ServiceCollectionExtensions
{
    internal static IServiceCollection AddBrokerConnection(this IServiceCollection services)
    {
        services.AddMassTransit(config =>
        {
            config.AddConsumer<MediaProcessingCompletedConsumer>();

            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Url);

                cfg.Message<NormalizeVideoCommand>(x => x.SetEntityName("video-normalize-requested"));
                cfg.Message<ProcessMediaCommand>(x => x.SetEntityName("media-process-requested"));

                cfg.ReceiveEndpoint("media-ingest-processing-completed", e =>
                {
                    e.Bind("media-processing-completed", b =>
                    {
                        b.ExchangeType = "fanout";
                        b.Durable = true;
                    });
                    e.ConfigureConsumer<MediaProcessingCompletedConsumer>(context);
                });

                cfg.UseRawJsonSerializer(RawSerializerOptions.AnyMessageType, isDefault: true);
            });
        });

        return services;
    }
}

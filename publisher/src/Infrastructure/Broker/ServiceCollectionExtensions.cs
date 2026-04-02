using Contracts.Events;
using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Consumers;

namespace Publisher.Infrastructure.Broker;

internal static class ServiceCollectionExtensions
{
    internal static IServiceCollection AddBrokerConnection(this IServiceCollection services)
    {
        services.AddMassTransit(config =>
        {
            config.AddConsumer<PublishRequestedConsumer>();
            config.AddConsumer<ProjectCreatedConsumer>();
            config.AddConsumer<AssetReadyForPublishConsumer>();

            config.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter(includeNamespace: false));

            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Url);
                cfg.Message<PublicationStatusChanged>(x => x.SetEntityName("publication-status-changed"));
                cfg.Message<ProjectCreated>(x => x.SetEntityName("project-created"));
                cfg.Message<AssetReadyForPublish>(x => x.SetEntityName("asset-ready-for-publish"));

                cfg.UseRawJsonSerializer(RawSerializerOptions.AnyMessageType, isDefault: true);

                cfg.UseInMemoryOutbox(context);

                cfg.ConfigureEndpoints(context);
            });
        });

        return services;
    }
}

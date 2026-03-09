using Contracts;
using MassTransit;
using MediaIngest.Infrastructure.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace MediaIngest.Infrastructure.Broker;

internal static class ServiceCollectionExtensions
{
    internal static IServiceCollection AddBrokerConnection(this IServiceCollection services)
    {
        services.AddMassTransit(config =>
        {
            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Url);

                cfg.Message<NormalizeVideoCommand>(x => x.SetEntityName("video-normalize-requested"));

                cfg.UseRawJsonSerializer(RawSerializerOptions.AnyMessageType, isDefault: true);
            });
        });

        return services;
    }
}

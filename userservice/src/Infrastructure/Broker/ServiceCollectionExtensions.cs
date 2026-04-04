using Contracts;
using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Options;
using UserService.Infrastructure.Broker.Consumers;
using UserService.Infrastructure.Broker.Filters;

namespace UserService.Infrastructure.Broker;

internal static class ServiceCollectionExtensions
{
    internal static IServiceCollection AddBrokerConnection(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);

        services.AddMassTransit(config =>
        {
            config.AddConsumer<ProjectAssetGeneratedConsumer>();
            config.AddConsumer<FinalAssetGeneratedConsumer>();

            config.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter(includeNamespace: false));

            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Url);
                cfg.UseConsumeFilter(typeof(UserContextConsumeFilter<>), context);

                cfg.Message<ProjectCreatedEvent>(x => x.SetEntityName("project-created"));
                cfg.Message<ProjectAssetGenerated>(x => x.SetEntityName("project-asset-generated"));
                cfg.Message<FinalAssetGenerated>(x => x.SetEntityName("final-asset-generated"));
                cfg.Message<AssetRegistered>(x => x.SetEntityName("asset-registered"));

                cfg.UseRawJsonSerializer(RawSerializerOptions.AnyMessageType, isDefault: true);

                cfg.UseInMemoryOutbox(context);
                cfg.ConfigureEndpoints(context);
            });
        });

        return services;
    }
}

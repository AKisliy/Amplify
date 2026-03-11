using Contracts;
using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Options;

namespace UserService.Infrastructure.Broker;

internal static class ServiceCollectionExtensions
{
    internal static IServiceCollection AddBrokerConnection(this IServiceCollection services)
    {
        services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);

        services.AddMassTransit(config =>
        {
            config.UsingRabbitMq((context, cfg) =>
            {
                var options = context.GetRequiredService<IOptions<RabbitMQOptions>>().Value;
                cfg.Host(options.Url);

                cfg.Message<ProjectCreatedEvent>(x => x.SetEntityName("project-created"));

                cfg.UseRawJsonSerializer(RawSerializerOptions.AnyMessageType, isDefault: true);
            });
        });

        return services;
    }
}

using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Publisher.Application.Common.Behaviours;

namespace Publisher.Application;

public static class DependencyInjection
{
    public static void AddApplicationServices(this IHostApplicationBuilder builder)
    {
        builder.Services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AssemblyMarker).Assembly);
            cfg.AddOpenBehavior(typeof(ValidationBehaviour<,>));
        });
        builder.Services.AddAutoMapper(Assembly.GetExecutingAssembly());
    }
}

using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Telegram.Bot;
using WebSocketGateway.Application.Common.Interfaces;
using WebSocketGateway.Application.NotificationSettings.Commands.GenerateLinkToken;
using WebSocketGateway.Infrastructure.Broker;
using WebSocketGateway.Infrastructure.Data;
using WebSocketGateway.Infrastructure.SignalR;
using WebSocketGateway.Infrastructure.Telegram;

namespace WebSocketGateway.Infrastructure;

public static class DependencyInjection
{
    public static IHostApplicationBuilder AddInfrastructureServices(
        this IHostApplicationBuilder builder
    )
    {
        builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        builder.AddPersistence();
        builder.AddBroker();
        builder.AddTelegram();

        builder.Services.AddMemoryCache();

        builder.Services.AddSingleton<UserConnectionTracker>();
        builder.Services.AddSingleton<IUserConnectionTracker>(sp =>
            sp.GetRequiredService<UserConnectionTracker>()
        );
        builder.Services.AddSingleton<IUserPresenceChecker, SignalRUserPresenceChecker>();

        builder.Services.AddScoped<ITelegramLinkTokenCache, TelegramLinkTokenCache>();

        return builder;
    }

    private static IHostApplicationBuilder AddTelegram(this IHostApplicationBuilder builder)
    {
        builder
            .Services.AddOptions<TelegramOptions>()
            .BindConfiguration(TelegramOptions.ConfigurationSection)
            .ValidateDataAnnotations();

        builder.Services.AddSingleton<ITelegramBotClient>(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<TelegramOptions>>().Value;
            return new TelegramBotClient(opts.BotToken);
        });

        builder.Services.AddScoped<ITelegramNotifier, TelegramBotNotifier>();

        builder.Services.AddSingleton(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<TelegramOptions>>().Value;
            return new TelegramBotConfig(opts.BotUsername);
        });

        builder.Services.AddHostedService<TelegramWebhookSetupService>();

        return builder;
    }
}

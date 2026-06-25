using WebSocketGateway.Application;
using WebSocketGateway.Infrastructure;
using WebSocketGateway.Infrastructure.Configuration;
using WebSocketGateway.Infrastructure.SignalR;
using WebSocketGateway.Web.Configuration.Extensions;
using WebSocketGateway.Web.Endpoints;
using WebSocketGateway.Web.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddInfrastructureWebServices();

builder.Services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);

var app = builder.Build();

app.UseHealthChecks("/health");

if (app.Environment.IsDevelopment())
    app.UseCors("Dev");

app.UseAuthentication();
app.UseAuthorization();
app.UseCurrentUser();

app.MapHub<MainHub>("/hubs/main");
app.MapNotificationsEndpoints();
app.MapTelegramWebhookEndpoint();

app.Run();

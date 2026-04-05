using System.Reflection;
using FluentValidation;
using WebSocketGateway.Web.Broker;
using WebSocketGateway.Web.Configuration;
using WebSocketGateway.Web.Configuration.Extensions;
using WebSocketGateway.Web.Hubs;
using WebSocketGateway.Web.State;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<JobNotificationStateManager>();
builder.Services.AddSingleton<NodeNotificationStateManager>();
builder.AddBroker();
builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

builder.AddInfrastructureServices();


builder.Services.AddOptionsWithFluentValidation<RabbitMQOptions>(RabbitMQOptions.ConfigurationSection);

var app = builder.Build();

app.UseHealthChecks("/health");

if (app.Environment.IsDevelopment())
    app.UseCors("Dev");

app.UseAuthentication();
app.UseAuthorization();

app.MapHub<MainHub>("/hubs/main");

app.Run();

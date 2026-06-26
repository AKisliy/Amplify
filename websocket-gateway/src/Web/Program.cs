using Microsoft.AspNetCore.HttpOverrides;
using WebSocketGateway.Application;
using WebSocketGateway.Application.Common.Options;
using WebSocketGateway.Infrastructure;
using WebSocketGateway.Infrastructure.Configuration;
using WebSocketGateway.Infrastructure.SignalR;
using WebSocketGateway.Web.Endpoints;
using WebSocketGateway.Web.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddInfrastructureWebServices();

var app = builder.Build();

var basePath = builder.Configuration.GetValue<string>("BasePath");
if (!string.IsNullOrEmpty(basePath))
    app.UsePathBase(basePath);

app.UseForwardedHeaders(
    new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost,
    }
);

app.UseHealthChecks("/health");

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseSwaggerUi(settings =>
{
    settings.Path = "/api";
    settings.DocumentPath = "specification.json";
});

if (app.Environment.IsDevelopment())
    app.UseCors("Dev");

app.UseAuthentication();
app.UseAuthorization();
app.UseCurrentUser();

app.MapHub<MainHub>("/hubs/main");
app.Map("/", () => Results.Redirect("api/index.html?url=specification.json"));

app.MapNotificationsEndpoints();
app.MapTelegramWebhookEndpoint();

app.Run();

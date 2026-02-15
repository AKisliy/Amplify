using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using Publisher.Infrastructure.Configuration.Options;
using Publisher.Infrastructure.Data;
using Publisher.Infrastructure.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.AddKeyVaultIfConfigured();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddWebServices();

builder.Services.AddSignalR();

var app = builder.Build();

var publisherOptions = app.Services.GetRequiredService<IOptions<PublisherOptions>>().Value;
if (!string.IsNullOrEmpty(publisherOptions.BasePath))
{
    app.Logger.LogInformation("Using path base: {PathBase}", publisherOptions.BasePath);
    app.UsePathBase(publisherOptions.BasePath);
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    await app.InitialiseDatabaseAsync();
}
else
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseInfrastructure();

app.UseHealthChecks("/health");
app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseSwaggerUi(settings =>
{
    settings.Path = "/api";
    settings.DocumentPath = "specification.json";
});

app.UseAuthentication();
app.UseAuthorization();

app.UseExceptionHandler(options => { });

app.Map("/", () => Results.Redirect("api/index.html?url=specification.json"));
app.MapHub<PublisherHub>("/hubs/publisher");

app.MapEndpoints();

app.Run();

public partial class Program { }

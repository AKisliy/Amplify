using MediaIngest.Infrastructure.Configuration;
using MediaIngest.Infrastructure.Data;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.AddKeyVaultIfConfigured();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddWebServices();

var app = builder.Build();

var ingestOptions = app.Services.GetRequiredService<IOptions<MediaIngestOptions>>().Value;
if (!string.IsNullOrEmpty(ingestOptions.BasePath))
{
    app.Logger.LogInformation("Using path base: {PathBase}", ingestOptions.BasePath);
    app.UsePathBase(ingestOptions.BasePath);
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
    app.UseHsts();
}

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

app.Map("/", (HttpContext context) =>
{
    var basePath = context.Request.PathBase.Value;
    var redirectUrl = string.IsNullOrEmpty(basePath)
        ? "api/index.html?url=specification.json"
        : $"{basePath}/api/index.html?url=specification.json";

    return Results.Redirect(redirectUrl);
});

app.MapEndpoints();

app.Run();

public partial class Program { }

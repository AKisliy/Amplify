using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using UserService.Infrastructure.Data;
using UserService.Infrastructure.Options;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.AddKeyVaultIfConfigured();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddWebServices();

var app = builder.Build();

var options = app.Services.GetRequiredService<IOptions<UserserviceOptions>>().Value;
if (!string.IsNullOrEmpty(options.BasePath))
{
    app.UsePathBase(options.BasePath);
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

app.UseHealthChecks("/health");

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseOpenApi(settings =>
{
    settings.Path = "/api/specification.json";
});

app.UseAuthentication();
app.UseAuthorization();

var corsOptions = app.Services.GetRequiredService<IOptions<CorsOptions>>();
app.UseCors(corsOptions.Value.DefaultPolicyName);

app.UseExceptionHandler(options => { });

app.Map("/", () => Results.Redirect("/api/index.html?url=/api/specification.json"));

app.MapEndpoints();

app.Run();

public partial class Program { }

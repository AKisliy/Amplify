using MediaIngest.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.AddKeyVaultIfConfigured();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddWebServices();

var app = builder.Build();

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

app.UseOpenApi(settings =>
{
    settings.Path = "/api/specification.json";
});

app.UseSwaggerUi(settings =>
{
    settings.Path = "/api";
    settings.DocumentPath = "/api/specification.json";
});


app.UseExceptionHandler(options => { });

app.Map("/", () => Results.Redirect("/api/index.html?url=/api/specification.json"));

app.MapEndpoints();

app.Run();

public partial class Program { }

using AiGateway.Web.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

builder.AddInfrastructureServices();
builder.AddWebServices();

var app = builder.Build();

app.UseHealthChecks("/health");

app.UseSwagger();
app.UseSwaggerUI();

app.MapTranscriptionEndpoints();

app.Run();

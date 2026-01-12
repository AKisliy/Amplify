using Publisher.Application;
using Publisher.Infrastructure;
using Publisher.WebApi.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddWebServices();
builder.AddApplicationServices();
builder.AddInfrastucture();

builder.Services.AddDataProtection();

var app = builder.Build();


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseExceptionHandler(_ => { });

app.MapEndpoints();

app.Run();

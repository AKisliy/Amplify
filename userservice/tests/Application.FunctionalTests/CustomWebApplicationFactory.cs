using System.Data.Common;
using MassTransit;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Interfaces.Clients;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace UserService.Application.FunctionalTests;

using static Testing;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString;

    public CustomWebApplicationFactory(DbConnection _, string connectionString)
    {
        _connectionString = connectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder
            .UseEnvironment("Testing")
            .UseSetting("ConnectionStrings:UserServiceDb", _connectionString);

        builder.ConfigureTestServices(services =>
        {
            services
                .RemoveAll<IUser>()
                .AddTransient(_ =>
                {
                    var mock = new Mock<IUser>();
                    mock.SetupGet(x => x.Roles).Returns(GetRoles());
                    mock.SetupGet(x => x.Id).Returns(GetUserId());
                    return mock.Object;
                });

            services.AddMassTransitTestHarness();

            services
                .RemoveAll<IMediaServiceClient>()
                .AddTransient(_ => Mock.Of<IMediaServiceClient>());

            // Mock email service — register/forgot-password shouldn't send real emails in tests
            services
                .RemoveAll<IEmailService>()
                .AddTransient(_ => Mock.Of<IEmailService>());
        });
    }
}

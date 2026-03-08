using Ardalis.GuardClauses;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Moq;
using Publisher.Application.Connections.Commands.DisconnectAccount;
using Publisher.Domain.Entities;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Data;
using Shouldly;

namespace Publisher.Application.UnitTests.Connections;

[TestFixture]
public class DisconnectAccountCommandTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var protector = new Mock<IDataProtector>();
        protector.Setup(p => p.Protect(It.IsAny<byte[]>())).Returns<byte[]>(b => b);
        protector.Setup(p => p.Unprotect(It.IsAny<byte[]>())).Returns<byte[]>(b => b);
        var dataProtectionProvider = new Mock<IDataProtectionProvider>();
        dataProtectionProvider.Setup(p => p.CreateProtector(It.IsAny<string>())).Returns(protector.Object);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options, dataProtectionProvider.Object);
    }

    [Test]
    public async Task Handle_WhenLastProject_DeletesAccount()
    {
        await using var dbContext = CreateDbContext();

        var project = new Project { Id = Guid.NewGuid() };
        var account = new SocialAccount
        {
            Id = Guid.NewGuid(),
            ProviderUserId = "u1",
            Username = "user1",
            Provider = SocialProvider.Instagram,
            Credentials = "{}",
            TokenExpiresAt = DateTime.UtcNow.AddDays(60)
        };
        account.Projects.Add(project);
        dbContext.Projects.Add(project);
        dbContext.SocialAccounts.Add(account);
        await dbContext.SaveChangesAsync();

        var handler = new DisconnectAccountCommandHandler(dbContext);
        await handler.Handle(new DisconnectAccountCommand(account.Id, project.Id), CancellationToken.None);

        var remaining = await dbContext.SocialAccounts.FindAsync(account.Id);
        remaining.ShouldBeNull();
    }

    [Test]
    public async Task Handle_WhenMultipleProjects_RemovesLinkOnly()
    {
        await using var dbContext = CreateDbContext();

        var project1 = new Project { Id = Guid.NewGuid() };
        var project2 = new Project { Id = Guid.NewGuid() };
        var account = new SocialAccount
        {
            Id = Guid.NewGuid(),
            ProviderUserId = "u2",
            Username = "user2",
            Provider = SocialProvider.Instagram,
            Credentials = "{}",
            TokenExpiresAt = DateTime.UtcNow.AddDays(60)
        };
        account.Projects.Add(project1);
        account.Projects.Add(project2);
        dbContext.Projects.AddRange(project1, project2);
        dbContext.SocialAccounts.Add(account);
        await dbContext.SaveChangesAsync();

        var handler = new DisconnectAccountCommandHandler(dbContext);
        await handler.Handle(new DisconnectAccountCommand(account.Id, project1.Id), CancellationToken.None);

        var remaining = await dbContext.SocialAccounts
            .Include(sa => sa.Projects)
            .FirstOrDefaultAsync(sa => sa.Id == account.Id);

        remaining.ShouldNotBeNull();
        remaining!.Projects.ShouldHaveSingleItem();
        remaining.Projects.Single().Id.ShouldBe(project2.Id);
    }

    [Test]
    public async Task Handle_WhenAccountNotFound_ThrowsNotFoundException()
    {
        await using var dbContext = CreateDbContext();

        var handler = new DisconnectAccountCommandHandler(dbContext);
        var missingId = Guid.NewGuid();

        await Should.ThrowAsync<NotFoundException>(
            () => handler.Handle(new DisconnectAccountCommand(missingId, Guid.NewGuid()), CancellationToken.None));
    }

    [Test]
    public async Task Handle_WhenProjectNotLinked_ThrowsNotFoundException()
    {
        await using var dbContext = CreateDbContext();

        var project = new Project { Id = Guid.NewGuid() };
        var account = new SocialAccount
        {
            Id = Guid.NewGuid(),
            ProviderUserId = "u3",
            Username = "user3",
            Provider = SocialProvider.Instagram,
            Credentials = "{}",
            TokenExpiresAt = DateTime.UtcNow.AddDays(60)
        };
        account.Projects.Add(project);
        dbContext.Projects.Add(project);
        dbContext.SocialAccounts.Add(account);
        await dbContext.SaveChangesAsync();

        var handler = new DisconnectAccountCommandHandler(dbContext);
        var unlinkedProjectId = Guid.NewGuid();

        await Should.ThrowAsync<NotFoundException>(
            () => handler.Handle(new DisconnectAccountCommand(account.Id, unlinkedProjectId), CancellationToken.None));
    }
}

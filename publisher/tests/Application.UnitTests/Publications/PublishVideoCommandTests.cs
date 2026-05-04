using Ardalis.GuardClauses;
using AutoMapper;
using FluentValidation;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Application.Common.Models;
using Publisher.Application.Common.Models.Dto;
using Publisher.Application.Publications.Commands.PublishVideo;
using Publisher.Domain.Entities;
using Publisher.Domain.Entities.PublicationSetup;
using Publisher.Domain.Enums;
using Publisher.Infrastructure.Data;
using Shouldly;

namespace Publisher.Application.UnitTests.Publications;

[TestFixture]
public class PublishVideoCommandTests
{
    private ApplicationDbContext _dbContext = null!;
    private Mock<ISocialMediaPublisherFactory> _publisherFactory = null!;
    private Mock<IUser> _user = null!;
    private Mock<IMapper> _mapper = null!;

    [SetUp]
    public void SetUp()
    {
        var protector = new Mock<IDataProtector>();
        protector.Setup(p => p.Protect(It.IsAny<byte[]>())).Returns<byte[]>(b => b);
        protector.Setup(p => p.Unprotect(It.IsAny<byte[]>())).Returns<byte[]>(b => b);
        var dataProtectionProvider = new Mock<IDataProtectionProvider>();
        dataProtectionProvider.Setup(p => p.CreateProtector(It.IsAny<string>())).Returns(protector.Object);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _dbContext = new ApplicationDbContext(options, dataProtectionProvider.Object);
        _publisherFactory = new Mock<ISocialMediaPublisherFactory>();
        _user = new Mock<IUser>();
        _mapper = new Mock<IMapper>();

        _mapper
            .Setup(m => m.Map<List<PublicationRecordResponseDto>>(It.IsAny<object>()))
            .Returns<object>(src => ((List<PublicationRecord>)src)
                .Select(r => new PublicationRecordResponseDto
                {
                    Id = r.Id,
                    Provider = r.Provider,
                    Status = r.Status,
                    Description = r.Description,
                    ScheduledAt = r.ScheduledAt,
                    PublicationType = r.PublicationType
                }).ToList());
    }

    [TearDown]
    public async Task TearDown()
    {
        await _dbContext.DisposeAsync();
    }

    private PublishVideoCommandHandler CreateHandler() =>
        new(NullLogger<PublishVideoCommandHandler>.Instance,
            _dbContext,
            _publisherFactory.Object,
            _user.Object,
            _mapper.Object);

    private async Task<(MediaPost mediaPost, SocialAccount account)> SeedBasicDataAsync(
        SocialProvider provider = SocialProvider.Instagram)
    {
        var mediaPost = new MediaPost { Id = Guid.NewGuid(), ProjectId = Guid.NewGuid(), MediaId = Guid.NewGuid() };
        var account = new SocialAccount
        {
            Id = Guid.NewGuid(),
            ProviderUserId = "uid1",
            Username = "user1",
            Provider = provider,
            Credentials = "{}",
            TokenExpiresAt = DateTime.UtcNow.AddDays(60)
        };
        _dbContext.MediaPosts.Add(mediaPost);
        _dbContext.SocialAccounts.Add(account);
        await _dbContext.SaveChangesAsync(CancellationToken.None);
        return (mediaPost, account);
    }

    [Test]
    public async Task Handle_WhenUserIdIsNull_ThrowsException()
    {
        _user.Setup(u => u.Id).Returns((Guid?)null);
        var (mediaPost, account) = await SeedBasicDataAsync();
        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [account.Id], null, null, null);

        await Should.ThrowAsync<Exception>(() =>
            handler.Handle(command, CancellationToken.None));
    }

    [Test]
    public async Task Handle_WhenMediaPostNotFound_ThrowsNotFoundException()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var handler = CreateHandler();
        var command = new PublishVideoCommand(Guid.NewGuid(), [], null, null, null);

        await Should.ThrowAsync<NotFoundException>(() =>
            handler.Handle(command, CancellationToken.None));
    }

    [Test]
    public async Task Handle_WithTwoAccounts_CreatesTwoPublicationRecords()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var mediaPost = new MediaPost { Id = Guid.NewGuid(), ProjectId = Guid.NewGuid(), MediaId = Guid.NewGuid() };
        var account1 = new SocialAccount { Id = Guid.NewGuid(), ProviderUserId = "u1", Username = "user1", Provider = SocialProvider.Instagram, Credentials = "{}", TokenExpiresAt = DateTime.UtcNow.AddDays(60) };
        var account2 = new SocialAccount { Id = Guid.NewGuid(), ProviderUserId = "u2", Username = "user2", Provider = SocialProvider.TikTok, Credentials = "{}", TokenExpiresAt = DateTime.UtcNow.AddDays(60) };
        _dbContext.MediaPosts.Add(mediaPost);
        _dbContext.SocialAccounts.AddRange(account1, account2);
        await _dbContext.SaveChangesAsync(CancellationToken.None);

        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [account1.Id, account2.Id], "Test desc", null, null);

        var result = await handler.Handle(command, CancellationToken.None);

        result.ShouldNotBeNull();
        result.Count.ShouldBe(2);

        var saved = await _dbContext.PublicationRecords.ToListAsync();
        saved.Count.ShouldBe(2);
        saved.ShouldAllBe(r => r.MediaPostId == mediaPost.Id);
        saved.ShouldAllBe(r => r.Status == PublicationStatus.Scheduled);
        saved.ShouldAllBe(r => r.Description == "Test desc");
        saved.Select(r => r.SocialAccountId).ShouldBe([account1.Id, account2.Id], ignoreOrder: true);
        saved.Select(r => r.Provider).ShouldBe([SocialProvider.Instagram, SocialProvider.TikTok], ignoreOrder: true);
    }

    [Test]
    public async Task Handle_WhenNoMatchingAccounts_ReturnsEmptyList()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var (mediaPost, _) = await SeedBasicDataAsync();
        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [Guid.NewGuid()], null, null, null);

        await Should.ThrowAsync<NotFoundException>(() =>
            handler.Handle(command, CancellationToken.None));

        (await _dbContext.PublicationRecords.CountAsync()).ShouldBe(0);
    }

    [Test]
    public async Task Handle_WithScheduledAt_SetsScheduledAtOnRecord()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var (mediaPost, account) = await SeedBasicDataAsync();
        var scheduledAt = DateTimeOffset.UtcNow.AddDays(2);
        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [account.Id], null, null, scheduledAt);

        await handler.Handle(command, CancellationToken.None);

        var record = await _dbContext.PublicationRecords.SingleAsync();
        record.ScheduledAt.ShouldBe(scheduledAt);
    }

    [Test]
    public async Task Handle_WithoutScheduledAt_ScheduledAtIsNull()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var (mediaPost, account) = await SeedBasicDataAsync();
        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [account.Id], null, null, null);

        await handler.Handle(command, CancellationToken.None);

        var record = await _dbContext.PublicationRecords.SingleAsync();
        record.ScheduledAt.ShouldBeNull();
    }

    [Test]
    public async Task Handle_WithInstagramSettings_MapsSettingsOntoRecord()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var (mediaPost, account) = await SeedBasicDataAsync();
        var instagramSettingsDto = new InstagramSettingsDto { ShareToFeed = true };
        var instagramSettings = new InstagramSettings { ShareToFeed = true };
        _mapper.Setup(m => m.Map<InstagramSettings>(instagramSettingsDto)).Returns(instagramSettings);

        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [account.Id], null, null, null, instagramSettingsDto);

        await handler.Handle(command, CancellationToken.None);

        _mapper.Verify(m => m.Map<InstagramSettings>(instagramSettingsDto), Times.Once);
        var record = await _dbContext.PublicationRecords.SingleAsync();
        record.PublicationSettings.ShouldNotBeNull();
        record.PublicationSettings!.Instagram.ShouldNotBeNull();
        record.PublicationSettings.Instagram!.ShareToFeed.ShouldBeTrue();
    }

    [Test]
    public async Task Handle_WithoutInstagramSettings_PublicationSettingsHasNoInstagram()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var (mediaPost, account) = await SeedBasicDataAsync();
        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [account.Id], null, null, null);

        await handler.Handle(command, CancellationToken.None);

        _mapper.Verify(m => m.Map<InstagramSettings>(It.IsAny<InstagramSettingsDto>()), Times.Never);
        var record = await _dbContext.PublicationRecords.SingleAsync();
        record.PublicationSettings?.Instagram.ShouldBeNull();
    }

    [Test]
    public async Task Handle_CreatedRecord_HasManualPublicationType()
    {
        _user.Setup(u => u.Id).Returns(Guid.NewGuid());
        var (mediaPost, account) = await SeedBasicDataAsync();
        var handler = CreateHandler();
        var command = new PublishVideoCommand(mediaPost.Id, [account.Id], null, null, null);

        await handler.Handle(command, CancellationToken.None);

        var record = await _dbContext.PublicationRecords.SingleAsync();
        record.PublicationType.ShouldBe(PublicationType.Manual);
    }
}

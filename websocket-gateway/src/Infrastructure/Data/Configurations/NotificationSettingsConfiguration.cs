using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebSocketGateway.Domain.Entities;

namespace WebSocketGateway.Infrastructure.Data.Configurations;

public class NotificationSettingsConfiguration : IEntityTypeConfiguration<NotificationSettings>
{
    public void Configure(EntityTypeBuilder<NotificationSettings> builder)
    {
        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.UserId).IsUnique();

        builder.Property(e => e.UserId)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(e => e.TelegramUsername)
            .HasMaxLength(64);
    }
}

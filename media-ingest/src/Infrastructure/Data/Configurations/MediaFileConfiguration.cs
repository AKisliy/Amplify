using MediaIngest.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediaIngest.Infrastructure.Data.Configurations;

public class MediaFileConfiguration : IEntityTypeConfiguration<MediaFile>
{
    public void Configure(EntityTypeBuilder<MediaFile> builder)
    {
        builder.HasOne<MediaFile>()
            .WithMany()
            .HasForeignKey(m => m.ParentMediaId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);

        builder.HasIndex(m => new { m.ParentMediaId, m.Variant })
            .IsUnique()
            .HasFilter("parent_media_id IS NOT NULL");
    }
}

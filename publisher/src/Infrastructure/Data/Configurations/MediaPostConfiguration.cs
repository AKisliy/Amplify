using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Publisher.Domain.Entities;

namespace Publisher.Infrastructure.Data.Configurations;

public class MediaPostConfiguration : IEntityTypeConfiguration<MediaPost>
{
    public void Configure(EntityTypeBuilder<MediaPost> entity)
    {
        entity.OwnsOne(e => e.PublicationSettings, ps =>
        {
            ps.ToJson();

            ps.OwnsOne(p => p.Instagram);
        });
    }
}
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Publisher.Domain.Entities;

namespace Publisher.Infrastructure.Data.Configurations;

public class PublicationRecordConfiguration : IEntityTypeConfiguration<PublicationRecord>
{
    public void Configure(EntityTypeBuilder<PublicationRecord> entity)
    {
        entity.OwnsOne(e => e.PublicationSettings, ps =>
        {
            ps.ToJson();

            ps.OwnsOne(p => p.Instagram);
        });
    }
}
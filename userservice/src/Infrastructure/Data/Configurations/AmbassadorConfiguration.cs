using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UserService.Domain.Entities;

namespace UserService.Infrastructure.Data.Configurations;

public class AmbassadorConfiguration : IEntityTypeConfiguration<Ambassador>
{
    public void Configure(EntityTypeBuilder<Ambassador> builder)
    {
        builder.HasOne(a => a.Project)
            .WithOne(x => x.Ambassador)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);
    }
}

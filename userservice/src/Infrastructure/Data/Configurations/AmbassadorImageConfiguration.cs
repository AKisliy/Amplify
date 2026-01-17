using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UserService.Domain.Entities;

namespace UserService.Infrastructure.Data.Configurations;

public class AmbassadorImageConfiguration : IEntityTypeConfiguration<AmbassadorImage>
{
    public void Configure(EntityTypeBuilder<AmbassadorImage> builder)
    {
        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(ai => ai.AmbassadorId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);
    }
}
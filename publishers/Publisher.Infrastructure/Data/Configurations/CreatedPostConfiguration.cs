using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Publisher.Core.Entities;

namespace Publisher.Infrastructure.Data.Configurations;

public class CreatedPostConfiguration : IEntityTypeConfiguration<CreatedPost>
{
    public void Configure(EntityTypeBuilder<CreatedPost> builder)
    {
        builder
            .HasOne(x => x.PostContainer)
            .WithOne(pc => pc.LastPublishedPost)
            .HasForeignKey<PostContainer>(pc => pc.LastPublishedPostId);
    }
}

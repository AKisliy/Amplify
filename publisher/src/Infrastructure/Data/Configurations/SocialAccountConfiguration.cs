using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Publisher.Domain.Entities;

namespace Publisher.Infrastructure.Data.Configurations;

public class SocialAccountConfiguration : IEntityTypeConfiguration<SocialAccount>
{
    public void Configure(EntityTypeBuilder<SocialAccount> builder)
    {
        builder.HasIndex(sa => new { sa.Provider, sa.ProviderUserId })
            .IsUnique();

        builder.HasMany(sa => sa.Projects)
            .WithMany(p => p.SocialAccounts)
            .UsingEntity(j => j.ToTable("project_social_account"));
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UserService.Domain.Entities;

namespace UserService.Infrastructure.Data.Configurations;

public class GenerationSpendLogConfiguration : IEntityTypeConfiguration<GenerationSpendLog>
{
    private const string ViewName = "generation_spend";
    private const string UnknownModel = "unknown";

    public void Configure(EntityTypeBuilder<GenerationSpendLog> builder)
    {
        builder.HasNoKey();
        builder.ToView(ViewName);
        builder.HasQueryFilter(g => g.Model != UnknownModel);
    }
}

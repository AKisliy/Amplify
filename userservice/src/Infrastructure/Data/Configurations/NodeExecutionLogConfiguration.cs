using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UserService.Domain.Entities;

namespace UserService.Infrastructure.Data.Configurations;

public class NodeExecutionLogConfiguration : IEntityTypeConfiguration<NodeExecutionLog>
{
    private const string ViewName = "node_execution_log";

    public void Configure(EntityTypeBuilder<NodeExecutionLog> builder)
    {
        builder.HasNoKey();
        builder.ToView(ViewName);
    }
}

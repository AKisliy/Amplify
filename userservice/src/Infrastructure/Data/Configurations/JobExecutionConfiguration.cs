using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UserService.Domain.Entities;

namespace UserService.Infrastructure.Data.Configurations;

public class JobExecutionConfiguration : IEntityTypeConfiguration<JobExecution>
{
    private const string ViewName = "job_executions";

    public void Configure(EntityTypeBuilder<JobExecution> builder)
    {
        builder.HasNoKey();
        builder.ToView(ViewName);
    }
}

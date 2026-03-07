using FluentValidation;

namespace Publisher.Infrastructure.Scheduler;

public class RecurringJobsOptions
{
    public const string ConfigurationSection = "RecurringJobs";

    public bool AutoListJobEnabled { get; set; } = true;

    public bool TokenRefreshJobEnabled { get; set; } = true;
}


public class RecurringJobsOptionsValidator : AbstractValidator<RecurringJobsOptions>
{
    public RecurringJobsOptionsValidator()
    {
    }
}
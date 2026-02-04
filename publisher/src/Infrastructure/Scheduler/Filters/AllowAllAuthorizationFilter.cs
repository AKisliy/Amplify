using Hangfire.Dashboard;

namespace Publisher.Infrastructure.Scheduler.Filters;

public class AllowAllAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        return true;
    }
}
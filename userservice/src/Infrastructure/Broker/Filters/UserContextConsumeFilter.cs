using Contracts;
using MassTransit;
using UserService.Application.Common.Interfaces;
using UserService.Infrastructure.Identity;

namespace UserService.Infrastructure.Broker.Filters;

public class UserContextConsumeFilter<T>(IUser user) : IFilter<ConsumeContext<T>> where T : class
{
    public void Probe(ProbeContext context) { }

    public async Task Send(ConsumeContext<T> context, IPipe<ConsumeContext<T>> next)
    {
        if (context.Message is IAuditableMessage msg && user is UserContext)
            user.Id = msg.UserId;

        await next.Send(context);
    }
}

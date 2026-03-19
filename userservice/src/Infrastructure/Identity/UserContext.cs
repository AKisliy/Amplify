using UserService.Application.Common.Interfaces;

namespace UserService.Infrastructure.Identity;

public class UserContext : IUser
{
    public Guid? Id { get; set; }

    public List<string>? Roles { get; set; }
}

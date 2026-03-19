namespace UserService.Application.Common.Interfaces;

public interface IUser
{
    Guid? Id { get; set; }
    List<string>? Roles { get; set; }

}

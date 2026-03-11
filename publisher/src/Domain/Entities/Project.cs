
namespace Publisher.Domain.Entities;

public class Project : BaseEntity
{
    public Guid UserId { get; set; }

    public virtual ICollection<SocialAccount> SocialAccounts { get; set; } = [];
}

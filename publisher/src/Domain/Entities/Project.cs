
namespace Publisher.Domain.Entities;

public class Project : BaseEntity
{
    public virtual ICollection<SocialAccount> SocialAccounts { get; set; } = [];
}

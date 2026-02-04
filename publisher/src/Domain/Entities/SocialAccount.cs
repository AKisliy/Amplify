namespace Publisher.Domain.Entities;

public class SocialAccount : BaseEntity
{
    public Guid ProjectId { get; set; }
    public string Username { get; set; } = null!;
    public SocialProvider Provider { get; set; }
    public string Credentials { get; set; } = null!;
    public DateTime TokenExpiresAt { get; set; }

    public virtual Project Project { get; set; } = null!;
    public virtual ICollection<AutoList> AutoLists { get; set; } = [];
}

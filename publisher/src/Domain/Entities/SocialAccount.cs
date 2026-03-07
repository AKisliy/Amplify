namespace Publisher.Domain.Entities;

public class SocialAccount : BaseEntity
{
    public string ProviderUserId { get; set; } = null!;
    public string Username { get; set; } = null!;
    public SocialProvider Provider { get; set; }
    public string Credentials { get; set; } = null!;
    public DateTime TokenExpiresAt { get; set; }

    public virtual ICollection<Project> Projects { get; set; } = [];
    public virtual ICollection<AutoList> AutoLists { get; set; } = [];
}

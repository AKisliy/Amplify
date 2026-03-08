namespace Publisher.Domain.Entities;

public class InstagramCredentials : BaseEntity
{
    public string InstagramUserId { get; set; } = null!;

    public string InstagramUsername { get; set; } = null!;

    public string AccessToken { get; set; } = null!;
}

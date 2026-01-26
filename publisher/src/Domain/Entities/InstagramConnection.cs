namespace Publisher.Domain.Entities;

public class InstagramCredentials : BaseEntity
{
    public string InstagramBusinessAccountId { get; set; } = null!;

    public string InstagramUsername { get; set; } = null!;

    public string FacebookPageId { get; set; } = null!;

    public string AccessToken { get; set; } = null!;
}

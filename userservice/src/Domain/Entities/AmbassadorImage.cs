namespace UserService.Domain.Entities;

public class AmbassadorImage : BaseEntity
{
    public string ImageUrl { get; set; } = string.Empty;

    public ImageType ImageType { get; set; }

    public Guid AmbassadorId { get; set; }
}

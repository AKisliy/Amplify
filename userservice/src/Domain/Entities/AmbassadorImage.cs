namespace UserService.Domain.Entities;

public class AmbassadorImage : BaseEntity
{
    public Guid MediaId { get; set; }

    public ImageType ImageType { get; set; }

    public Guid AmbassadorId { get; set; }
}

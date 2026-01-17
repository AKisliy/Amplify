namespace UserService.Domain.Events.AmbassadorImages;

public class AmbassadorImageDeletedEvent : BaseEvent
{
    public required AmbassadorImage Entity { get; set; }
}

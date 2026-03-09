namespace MediaIngest.Application.Media.Notifications;

public record VideoNormalizeRequested(Guid MediaId, string FileKey) : INotification;
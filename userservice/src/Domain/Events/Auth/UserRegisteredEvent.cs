namespace UserService.Domain.Events.Auth;

public class UserRegisteredEvent : BaseEvent
{
    public Guid UserId { get; }
    public string Email { get; }

    /// <summary>
    /// Raw (non-encoded) email confirmation token produced by ASP.NET Identity's UserManager.
    /// The event handler is responsible for Base64Url-encoding before embedding in the link.
    /// </summary>
    public string RawConfirmationToken { get; }

    public UserRegisteredEvent(Guid userId, string email, string rawConfirmationToken)
    {
        UserId = userId;
        Email = email;
        RawConfirmationToken = rawConfirmationToken;
    }
}

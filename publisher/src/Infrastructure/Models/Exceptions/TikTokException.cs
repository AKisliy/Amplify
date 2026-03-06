namespace Publisher.Infrastructure.Models.Exceptions;

public class TikTokException : Exception
{
    public string? ErrorCode { get; }
    public string? LogId { get; }

    public TikTokException()
    {
    }

    public TikTokException(string? message) : base(message)
    {
    }

    public TikTokException(string? message, Exception? innerException) : base(message, innerException)
    {
    }

    public TikTokException(string? errorCode, string? message, string? logId)
        : base(message)
    {
        ErrorCode = errorCode;
        LogId = logId;
    }
}

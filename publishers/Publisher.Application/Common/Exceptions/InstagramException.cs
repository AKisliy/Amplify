using Publisher.Application.Common.Models.Instagram;

namespace Publisher.Application.Common.Exceptions;

public class InstagramException : Exception
{
    public InstagramErrorDetail? ErrorDetail { get; init; }
    public InstagramDebugInfo? DebugInfo { get; init; }

    public InstagramException(string message) : base(message)
    {
    }

    public InstagramException()
    {
    }

    public InstagramException(string? message, Exception? innerException) : base(message, innerException)
    {
    }

    public InstagramException(InstagramErrorDetail error)
    {
        ErrorDetail = error;
    }

    public InstagramException(InstagramDebugInfo debugInfo)
    {
        DebugInfo = debugInfo;
    }

    public InstagramException(string message, InstagramErrorDetail errorDetail) : base(message)
    {
        ErrorDetail = errorDetail;
    }
}
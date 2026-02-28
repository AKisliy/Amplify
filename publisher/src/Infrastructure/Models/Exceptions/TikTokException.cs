using System.Runtime.Serialization;

namespace Publisher.Infrastructure.Models.Exceptions;

public class TikTokException : Exception
{
    public TikTokException()
    {
    }

    public TikTokException(string? message) : base(message)
    {
    }

    public TikTokException(string? message, Exception? innerException) : base(message, innerException)
    {
    }
}

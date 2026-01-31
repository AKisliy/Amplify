using System.Runtime.Serialization;

namespace Publisher.Domain.Exceptions;

public class PublishingException : Exception
{
    public PublishingException()
    {
    }

    public PublishingException(string? message) : base(message)
    {
    }

    public PublishingException(string? message, Exception? innerException) : base(message, innerException)
    {
    }
}

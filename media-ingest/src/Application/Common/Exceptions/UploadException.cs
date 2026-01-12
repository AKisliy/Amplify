using System.Runtime.Serialization;

namespace MediaIngest.Application.Common.Exceptions;

public class UploadException : Exception
{
    public UploadException()
    {
    }

    public UploadException(string? message) : base(message)
    {
    }

    public UploadException(string? message, Exception? innerException) : base(message, innerException)
    {
    }
}
namespace Publisher.Application.Common.Exceptions;

public class ConfigurationException : Exception
{
    public ConfigurationException() : base()
    {
    }

    public ConfigurationException(string? message) : base(message)
    {
    }

    public ConfigurationException(string? message, Exception? innerException) : base(message, innerException)
    {
    }
}

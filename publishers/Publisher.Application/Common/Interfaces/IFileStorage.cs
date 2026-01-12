namespace Publisher.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<string> GetPresignedUrl(string filePath);
}


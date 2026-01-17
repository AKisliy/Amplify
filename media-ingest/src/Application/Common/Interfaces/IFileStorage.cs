namespace MediaIngest.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<Stream> OpenFileAsync(string filePath, CancellationToken cancellationToken = default);

    Task<string> SaveFileAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default);

    Task<string> SaveFileAsync(byte[] fileContent, string fileName, CancellationToken cancellationToken = default);

    Task DeleteFileAsync(string path, CancellationToken cancellationToken = default);

    Task<string> GetPublicUrlAsync(string fileKey, TimeSpan validFor, CancellationToken cancellationToken = default);
}

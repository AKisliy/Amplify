using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<Stream> OpenFileAsync(string filePath, CancellationToken cancellationToken = default);

    Task<string> SaveFileAsync(Stream fileStream, string fileKey, CancellationToken cancellationToken = default);

    Task<string> SaveFileAsync(byte[] fileContent, string fileKey, CancellationToken cancellationToken = default);

    Task DeleteFileAsync(string path, CancellationToken cancellationToken = default);

    Task<string> GetPublicUrlAsync(MediaFile mediaFile, TimeSpan validFor, CancellationToken cancellationToken = default);
}

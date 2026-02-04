namespace Publisher.Application.Common.Interfaces;
public interface IFileStorage
{
    Task<string> GetPresignedUrlAsync(Guid fileId);
}


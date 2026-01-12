using Publisher.Application.Common.Interfaces;
using Publisher.Infrastructure.FileSystem;

namespace Publisher.Infrastructure.Storage;

public class LocalFileStorage : IFileStorage
{
    public Task<string> GetPresignedUrl(string filePath)
    {
        throw new NotImplementedException();
    }
}

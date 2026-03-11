namespace MediaIngest.Application.Common.Interfaces;

public interface IGoogleStorageService
{
    Task<Guid> SaveFileFromGsUriAsync(string gsUri, string contentType, CancellationToken cancellationToken = default);
}

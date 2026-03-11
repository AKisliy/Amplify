using MediaIngest.Application.Common.Interfaces;

namespace MediaIngest.Application.Media.Commands.ImportFromGoogleStorage;

public record ImportFromGoogleStorageDto(string GsUri, string ContentType) : IRequest;

public record ImportFromGoogleStorageResponse(IReadOnlyCollection<Guid> ImportedMediaIds);

public record ImportFromGoogleStorageCommand(IReadOnlyCollection<ImportFromGoogleStorageDto> Files) : IRequest<ImportFromGoogleStorageResponse>;


internal class ImportFromGoogleStorageHandler(IGoogleStorageService googleStorageService)
    : IRequestHandler<ImportFromGoogleStorageCommand, ImportFromGoogleStorageResponse>
{
    public async Task<ImportFromGoogleStorageResponse> Handle(ImportFromGoogleStorageCommand request, CancellationToken cancellationToken)
    {
        var importedMediaIds = new List<Guid>();

        foreach (var file in request.Files)
        {
            var mediaId = await googleStorageService.SaveFileFromGsUriAsync(file.GsUri, file.ContentType, cancellationToken);
            importedMediaIds.Add(mediaId);
        }

        return new ImportFromGoogleStorageResponse(importedMediaIds);
    }
}


using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;

namespace MediaIngest.Application.Media.Commands.ImportFromUrl;

public record ImportFromUrlCommand(string Url) : IRequest<ImportFromUrlDto>;

public record ImportFromUrlDto(Guid MediaId);

public class ImportFromUrlCommandHandler(
    HttpClient httpClient,
    IFileStorage fileStorage,
    IApplicationDbContext dbContext)
    : IRequestHandler<ImportFromUrlCommand, ImportFromUrlDto>
{
    public async Task<ImportFromUrlDto> Handle(ImportFromUrlCommand request, CancellationToken cancellationToken)
    {
        var response = await httpClient.GetAsync(request.Url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
        var extension = MimeTypes.GetMimeTypeExtensions(contentType).FirstOrDefault() ?? "bin";
        var fileName = $"{Guid.NewGuid()}.{extension}";

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var fileKey = await fileStorage.SaveFileAsync(stream, fileName, cancellationToken);

        var mediaFile = new MediaFile
        {
            FileKey = fileKey,
            ContentType = contentType,
        };
        dbContext.MediaFiles.Add(mediaFile);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new ImportFromUrlDto(mediaFile.Id);
    }
}

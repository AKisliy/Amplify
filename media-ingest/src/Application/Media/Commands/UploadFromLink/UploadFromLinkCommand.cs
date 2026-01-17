
using System.Net.Http.Headers;
using MediaIngest.Application.Common.Exceptions;
using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Media.Commands.Upload;

public record UploadFromLinkCommand
(
    string Link,
    MediaType MediaType
) : IRequest<UploadFileDto>;

public class UploadFromLinkCommandHandler(
    HttpClient httpClient,
    IMediaLinkResolverFactory factory,
    IFileStorage fileStorage,
    IApplicationDbContext dbContext
) : IRequestHandler<UploadFromLinkCommand, UploadFileDto>
{
    public async Task<UploadFileDto> Handle(UploadFromLinkCommand request, CancellationToken cancellationToken)
    {
        var linkResolver = factory.GetMediaLinkResolverForLink(request.Link);
        var directLink = await linkResolver.GetDirectDownloadLink(request.Link, request.MediaType);
        var response = await httpClient.GetAsync(directLink, HttpCompletionOption.ResponseHeadersRead);

        response.EnsureSuccessStatusCode();

        var fileName = GetFileName(response.Content.Headers);

        var stream = await response.Content.ReadAsStreamAsync();

        var fileKey = await fileStorage.SaveFileAsync(stream, fileName, cancellationToken);

        var mediaFile = new MediaFile
        {
            FileKey = fileKey
        };

        dbContext.MediaFiles.Add(mediaFile);

        await dbContext.SaveChangesAsync(cancellationToken);

        return new UploadFileDto(mediaFile.Id);
    }

    private string GetFileName(HttpContentHeaders contentHeaders)
    {
        var contentDisposition = contentHeaders.ContentDisposition;
        var fileName = contentDisposition?.FileName?.Trim('"');
        if (fileName is not null)
            return fileName;
        var mediaType = contentHeaders?.ContentType?.MediaType
            ?? throw new UploadException("Can't determine type of content based on response (content type is null)");
        var extension = MimeTypes.GetMimeTypeExtensions(mediaType).FirstOrDefault()
            ?? throw new UploadException($"Couldn't extract file extensions for Media type {mediaType}");
        return $"{Guid.NewGuid()}.{extension}";
    }
}

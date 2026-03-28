using AiGateway.Web.Clients.MediaIngest;
using AiGateway.Web.Clients.MediaIngest.Models;

namespace AiGateway.Web.Services;

public class MediaIngestService(
    MediaIngestClient mediaIngestClient,
    IHttpClientFactory httpClientFactory)
{
    public async Task<(Guid mediaId, string presignedUrl)> UploadMediaAsync(
        Stream mediaStream,
        string fileName,
        CancellationToken cancellationToken)
    {
        var request = new CreateUploadPresignedUrlCommand()
        {
            ContentType = MimeTypes.GetMimeType(fileName),
            FileName = $"{Guid.NewGuid()}_{fileName}",
            FileSize = mediaStream.Length
        };

        var uploadResponse = await mediaIngestClient.Api.Internal.Media.PresignedUpload.PostAsync(
            request,
            cancellationToken: cancellationToken);

        Guard.Against.Null(uploadResponse, nameof(uploadResponse));

        // Upload file to presigned URL
        var http = httpClientFactory.CreateClient();
        var content = new StreamContent(mediaStream);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(request.ContentType);

        await http.PutAsync(
            uploadResponse.UploadUrl,
            content,
            cancellationToken: cancellationToken);

        var presignedUrlResponse = await mediaIngestClient.Api.Internal.Media[uploadResponse.MediaId].Link.GetAsync(config =>
        {
            config.QueryParameters.LinkTypeAsLinkType = LinkType.Presigned;
        }, cancellationToken: cancellationToken);

        Guard.Against.Null(presignedUrlResponse, nameof(presignedUrlResponse));

        return (Guid.Parse(uploadResponse.MediaId!), presignedUrlResponse.Link!);
    }
}


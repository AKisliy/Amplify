using MediaIngest.Application.Media.Commands.Upload;
using MediaIngest.Domain.Enums;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Media : EndpointGroupBase
{
    public override string? GroupName => "media";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(UploadFromLink);
    }

    public async Task<Created<UploadFileDto>> UploadFromLink(ISender sender, string link, MediaType mediaType)
    {
        var uploadedDto = await sender.Send(new UploadFromLinkCommand(link, mediaType));

        return TypedResults.Created($"/media/{uploadedDto.UploadId}", uploadedDto);
    }
}

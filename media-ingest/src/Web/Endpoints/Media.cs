using MediaIngest.Application.Media.Commands.DeleteMedia;
using MediaIngest.Application.Media.Commands.Upload;
using MediaIngest.Application.Media.Queries.GetLinkById;
using MediaIngest.Application.Media.Queries.GetMedia;
using MediaIngest.Domain.Enums;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Media : EndpointGroupBase
{
    public override string? GroupName => "media";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(UploadFromLink);

        groupBuilder.MapGet("/{mediaId:guid}", GetMediaById).RequireAuthorization();
        groupBuilder.MapGet("/{mediaId:guid}/link", GetLinkById); // TODO: Add authorization 

        groupBuilder.MapDelete("/{mediaId:guid}", DeleteMediaById)
            .WithDescription("ONLY for internal use. Don't call from client apps.");
    }

    public async Task<Created<UploadFileDto>> UploadFromLink(ISender sender, string link, MediaType mediaType)
    {
        var uploadedDto = await sender.Send(new UploadFromLinkCommand(link, mediaType));

        return TypedResults.Created($"/media/{uploadedDto.UploadId}", uploadedDto);
    }

    public async Task<RedirectHttpResult> GetMediaById(ISender sender, Guid mediaId)
    {
        var mediaDto = await sender.Send(new GetMediaQuery(mediaId));
        return TypedResults.Redirect(mediaDto.MediaPath);
    }

    public async Task<NoContent> DeleteMediaById(ISender sender, Guid mediaId)
    {
        await sender.Send(new DeleteMediaCommand(mediaId));
        return TypedResults.NoContent();
    }

    public async Task<GetLinkByIdResponse> GetLinkById(ISender sender, Guid mediaId, LinkType linkType)
    {
        var query = new GetLinkByIdQuery(mediaId, linkType);
        var response = await sender.Send(query);
        return response;
    }
}

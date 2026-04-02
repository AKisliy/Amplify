using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Publisher.Application.Common.Models;
using Publisher.Application.Publications.Commands.PublishVideo;
using Publisher.Application.Publications.Queries.GetMediaPostRecords;

namespace Publisher.Web.Endpoints;

public class Publications : EndpointGroupBase
{
    public override string? GroupName => "publications";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("video", PublishVideoAsync).RequireAuthorization();
        groupBuilder.MapGet("media-posts/{mediaPostId:guid}/records", GetMediaPostRecordsAsync).RequireAuthorization();
    }

    public async Task<Results<Created<MediaPostResponseDto>, BadRequest>> PublishVideoAsync(IMediator mediator, [FromBody] PublishVideoCommand request)
    {
        var result = await mediator.Send(request, CancellationToken.None);
        return TypedResults.Created($"/publications/{result.Id}", result);
    }

    public async Task<Ok<List<PublicationRecordResponseDto>>> GetMediaPostRecordsAsync(IMediator mediator, Guid mediaPostId)
    {
        var result = await mediator.Send(new GetMediaPostRecordsQuery(mediaPostId));
        return TypedResults.Ok(result);
    }
}

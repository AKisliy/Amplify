using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Publisher.Application.Publications.Commands.PublishVideo;
using Publisher.Application.Publications.Models;

namespace Publisher.Web.Endpoints;

public class Publications : EndpointGroupBase
{
    public override string? GroupName => "publications";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("publish", PublishPostAsync);
    }

    public async Task<Results<Created<MediaPostDto>, BadRequest>> PublishPostAsync(IMediator mediator, [FromBody] PublishVideoCommand request)
    {
        var result = await mediator.Send(request, CancellationToken.None);

        return TypedResults.Created($"/publications/{result.Id}", result);
    }
}

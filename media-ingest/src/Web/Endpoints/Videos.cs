
using MediaIngest.Application.Media.Commands.UploadFromFile;
using MediaIngest.Domain.Enums;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MediaIngest.Web.Endpoints;

public class Videos : EndpointGroupBase
{
    public override string? GroupName => "videos";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
    }
}

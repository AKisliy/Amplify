using Flurl;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using UserService.Application.Common.Options;

namespace UserService.Application.Common.Mappings;

/// <summary>
/// Resolves image URL from a given source object.
/// <usepara>The source member is expected to be a Guid representing the image identifier.</usepara>
/// </summary>
public class ImageUrlResolver(
    IOptions<ExternalUrlsOptions> options,
    ILogger<ImageUrlResolver> logger)
    : IMemberValueResolver<object, object, Guid?, string?>, IMemberValueResolver<object, object, Guid, string>
{
    public string? Resolve(object source, object destination, Guid? sourceMember, string? destMember, ResolutionContext context)
    {
        if (sourceMember is not null && sourceMember != Guid.Empty)
            return Resolve(source, destination, sourceMember.Value, destMember ?? string.Empty, context);

        return null;
    }

    public string Resolve(object source, object destination, Guid sourceMember, string destMember, ResolutionContext context)
    {
        var baseUrl = options.Value.MediaServiceApi;

        logger.LogDebug("Resolving image URL for MediaId: {MediaId} using base URL: {BaseUrl}", sourceMember, baseUrl);

        return new Url(baseUrl)
            .AppendPathSegment("media")
            .AppendPathSegment(sourceMember.ToString())
            .ToString();
    }
}

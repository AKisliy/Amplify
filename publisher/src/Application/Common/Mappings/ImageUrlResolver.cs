using Flurl;
using Microsoft.Extensions.Options;
using Publisher.Application.Common.Options;

namespace Publisher.Application.Common.Mappings;

/// <summary>
/// Resolves image URL from a given source object.
/// <usepara>The source member is expected to be a Guid representing the image identifier.</usepara>
/// </summary>
public class ImageUrlResolver(IOptions<FrontendOptions> options)
    : IMemberValueResolver<object, object, Guid?, string?>, IMemberValueResolver<object, object, Guid, string>
{
    public string? Resolve(object source, object destination, Guid? sourceMember, string? destMember, ResolutionContext context)
    {
        var baseUrl = options.Value.MediaServiceUrl;

        if (sourceMember is not null && sourceMember != Guid.Empty)
        {
            return new Url(baseUrl).AppendPathSegment("media").AppendPathSegment(sourceMember.ToString()).ToString();
        }

        return null;
    }

    public string Resolve(object source, object destination, Guid sourceMember, string destMember, ResolutionContext context)
    {
        var baseUrl = options.Value.BaseUrl;

        return new Url(baseUrl).AppendPathSegment("media").AppendPathSegment(sourceMember.ToString()).ToString();
    }
}

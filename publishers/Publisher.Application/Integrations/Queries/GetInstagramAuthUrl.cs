using Microsoft.Extensions.Configuration;

namespace Publisher.Application.Integrations.Queries;

public record GetInstagramAuthUrlQuery : IRequest<string>;

public class GetInstagramAuthUrlHandler(IConfiguration configuration)
    : IRequestHandler<GetInstagramAuthUrlQuery, string>
{
    public Task<string> Handle(GetInstagramAuthUrlQuery request, CancellationToken cancellationToken)
    {
        var appId = configuration["Instagram:AppId"];
        var redirectUri = configuration["Instagram:RedirectUri"];
        var scope = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";

        var url = $"https://www.facebook.com/v18.0/dialog/oauth?client_id={appId}&redirect_uri={redirectUri}&scope={scope}&response_type=code";

        return Task.FromResult(url);
    }
}

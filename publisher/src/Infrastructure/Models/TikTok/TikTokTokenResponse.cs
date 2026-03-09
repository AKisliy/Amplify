using FluentValidation;
using Newtonsoft.Json;

namespace Publisher.Infrastructure.Models.TikTok;

public class TikTokTokenResponse
{
    [JsonProperty("access_token")]
    public string? AccessToken { get; set; }

    [JsonProperty("expires_in")]
    public int ExpiresIn { get; set; }

    [JsonProperty("refresh_token")]
    public string? RefreshToken { get; set; }

    [JsonProperty("refresh_expires_in")]
    public int RefreshExpiresIn { get; set; }

    [JsonProperty("open_id")]
    public string? OpenId { get; set; }

    [JsonProperty("scope")]
    public string? Scope { get; set; }

    [JsonProperty("token_type")]
    public string? TokenType { get; set; }
}

public class TikTokResponseValidator : AbstractValidator<TikTokTokenResponse>
{
    public TikTokResponseValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.ExpiresIn).GreaterThan(0);
        RuleFor(x => x.RefreshToken).NotEmpty();
        RuleFor(x => x.RefreshExpiresIn).GreaterThan(0);
        RuleFor(x => x.OpenId).NotEmpty();
    }
}

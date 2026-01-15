namespace UserService.Infrastructure.Options;

public class MyCookiesOptions
{
    public const string SectionName = "MyCookies";

    public required string AccessTokenCookieName { get; set; }

    public required string RefreshTokenCookieName { get; set; }
}
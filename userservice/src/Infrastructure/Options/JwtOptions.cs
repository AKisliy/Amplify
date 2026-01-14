namespace UserService.Infrastructure.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public required string Key { get; set; }

    public required string Issuer { get; set; }

    public required string Audience { get; set; }
}

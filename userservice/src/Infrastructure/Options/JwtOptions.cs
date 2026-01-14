namespace UserService.Infrastructure.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public required string Issuer { get; set; }

    public required string Audience { get; set; }

    public required string PrivateKeyPem { get; set; }
}

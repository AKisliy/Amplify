namespace UserService.Infrastructure.Options;

public class CorsOptions
{
    public const string SectionName = "CorsOptions";

    public IReadOnlyList<string> AllowedOrigins { get; set; } = [];

    public required string DefaultPolicyName { get; set; }
}

namespace MediaIngest.Infrastructure.Configuration;

public class CorsOptions
{
    public const string SectionName = "CorsOptions";

    public IReadOnlyList<string> AllowedOrigins { get; set; } = [];

    public string DefaultPolicyName { get; set; } = "DefaultCorsPolicy";
}

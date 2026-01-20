namespace Publisher.Infrastructure.Configuration;

public class InstagramApiOptions
{
    public required string AppId { get; init; }
    public required string RedirectUri { get; init; }

    public string ApiVersion { get; init; } = "v22.0";
    public int DailyLimit { get; init; } = 50;
    public string BaseGraphHostUrl { get; init; } = "https://graph.facebook.com";
    public string ResumableUploadHostUrl { get; init; } = "https://rupload.facebook.com";

    public class ContainerStatusQuerying
    {
        public int DelayMs { get; init; } = 60_000;
        public int Attempts { get; set; } = 5;
    }
}


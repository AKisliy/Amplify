using System.Text.Json.Serialization;

namespace Publisher.Infrastructure.Models.Facebook;

public class FacebookAccountsResponse
{
    [JsonPropertyName("data")]
    public List<FacebookPageData> Data { get; set; } = [];
}

public class FacebookPageData
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("instagram_business_account")]
    public InstagramAccountInfo? InstagramBusinessAccount { get; set; }
}

public class InstagramAccountInfo
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;
}

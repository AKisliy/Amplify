using System.Text.Json;
using Newtonsoft.Json;

namespace Publisher.Application.Common.Models.Instagram;

public class InstagramApiResponse
{
    [JsonProperty("id")]
    public string? Id { get; set; }

    [JsonProperty("success")]
    public bool? Success { get; set; }

    [JsonProperty("status_code")]
    public string? StatusCode { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("error")]
    public InstagramErrorDetail? Error { get; set; }

    [JsonProperty("debug_info")]
    public InstagramDebugInfo? DebugInfo { get; set; }

    [JsonProperty("shortcode")]
    public string? ShortCode { get; set; }
}

public class InstagramErrorDetail
{
    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("type")]
    public string? Type { get; set; }

    [JsonProperty("code")]
    public int? Code { get; set; }

    [JsonProperty("error_subcode")]
    public int? ErrorSubcode { get; set; }

    [JsonProperty("is_transient")]
    public bool? IsTransient { get; set; }

    [JsonProperty("error_user_title")]
    public string? ErrorUserTitle { get; set; }

    [JsonProperty("error_user_msg")]
    public string? ErrorUserMessage { get; set; }

    [JsonProperty("fbtrace_id")]
    public string? FbTraceId { get; set; }
}

public class InstagramDebugInfo
{
    [JsonProperty("retriable")]
    public bool? Retriable { get; set; }

    [JsonProperty("type")]
    public string? Type { get; set; }

    [JsonProperty("message")]
    public string? RawMessage { get; set; }

    public InstagramApiResponse? InnerParsedMessage => TryParseRawMessage();

    private InstagramApiResponse? TryParseRawMessage()
    {
        if (string.IsNullOrWhiteSpace(RawMessage))
            return null;

        try
        {
            return JsonConvert.DeserializeObject<InstagramApiResponse>(RawMessage);
        }
        catch
        {
            return null;
        }
    }
}

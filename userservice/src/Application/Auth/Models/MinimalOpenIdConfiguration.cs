using System.Text.Json.Serialization;

namespace UserService.Application.Auth.Models;

public class MinimalOpenIdConfiguration
{
    [JsonPropertyName("jwks_uri")]
    public required string JwksUri { get; set; }

    [JsonPropertyName("issuer")]
    public required string Issuer { get; set; }
}

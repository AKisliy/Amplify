using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Publisher.Domain.Enums;

namespace Publisher.Application.Common.Models;

public record ConnectionState(
    [property: JsonProperty("projectId")]
    Guid ProjectId,

    [property: JsonProperty("provider")]
    [property: JsonConverter(typeof(StringEnumConverter))]
    SocialProvider Provider);
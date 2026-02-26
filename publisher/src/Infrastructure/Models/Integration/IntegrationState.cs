using Newtonsoft.Json;

namespace Publisher.Infrastructure.Models.Integration;

public record IntegrationState(
    [property: JsonProperty("projectId")]
    Guid ProjectId);
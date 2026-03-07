using Microsoft.AspNetCore.Mvc;

namespace MediaIngest.Web.Endpoints.Models;

public record ImportFromUrlRequest([FromQuery] string Url);
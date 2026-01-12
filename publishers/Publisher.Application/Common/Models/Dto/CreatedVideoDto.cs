using Publisher.Core.Enums;

namespace Publisher.Application.Common.Models.Dto;

public class CreatedVideoDto
{
    public Guid Id { get; set; }
    public string VideoPath { get; set; } = null!;

    public VideoFormat VideoFormat { get; set; }

    public string? CoverFilePath { get; set; }

    public string? Description { get; set; }
}

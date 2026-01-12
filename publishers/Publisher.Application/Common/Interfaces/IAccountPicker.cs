using Publisher.Application.Common.Models.Dto;
using Publisher.Core.Entities;
using Publisher.Core.Enums;

namespace Publisher.Application.Common.Interfaces;

public interface IAccountPicker
{
    HashSet<VideoFormat> SupportedFormats { get; }
    Task<SocialMediaAccount?> PickAccountForPostingAsync(PickAccount pickData);
}

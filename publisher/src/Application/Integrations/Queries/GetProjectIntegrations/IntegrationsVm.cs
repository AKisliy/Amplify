using Publisher.Application.AutoLists.Queries.GetAutoList;
using Publisher.Application.Common.Models.Dto;

namespace Publisher.Application.Integrations.Queries.GetProjectIntegrations;

public class IntegrationsVm
{
    public IReadOnlyCollection<FullSocialAccountDto> Integrations { get; set; } = [];
}
using MediaIngest.Domain.Enums;

namespace MediaIngest.Application.Common.Interfaces;

public interface ILinkGeneratorFactory
{
    ILinkGenerator GetLinkGenerator(LinkType linkType);
}

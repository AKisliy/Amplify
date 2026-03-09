using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Enums;

namespace MediaIngest.Infrastructure.LinkGenerators;

public class LinkGeneratorFactory(IEnumerable<ILinkGenerator> linkGenerators) : ILinkGeneratorFactory
{
    public ILinkGenerator GetLinkGenerator(LinkType linkType)
    {
        return linkGenerators.FirstOrDefault(g => g.SupportedLinkType == linkType)
            ?? throw new NotSupportedException($"No link generator found for link type: {linkType}");
    }
}

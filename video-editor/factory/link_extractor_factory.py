from typing import Type, Dict, Any, Iterable, Tuple
from link_extractors.base_link_extractor import BaseLinkExtractor

class LinkExtractorFactory:
    def __init__(self, extractor_configs: Iterable[Tuple[Type[BaseLinkExtractor], Dict[str, Any]]]):
        """
        Принимает итерируемый объект с конфигурациями экстракторов.
        """
        self.extractors: list[BaseLinkExtractor] = []
        for extractor_class, dependencies in extractor_configs:
            instance = extractor_class(**dependencies)
            self.extractors.append(instance)

    def get_extractor(self, url: str) -> BaseLinkExtractor:
        for extractor in self.extractors:
            if extractor.can_handle(url):
                return extractor
        
        raise ValueError(f"No suitable extractor found for URL: {url}")
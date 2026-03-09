from factory.link_extractor_factory import LinkExtractorFactory
from link_extractors.instagram import InstagramLinkExtractor
from models.enum.media_type import MediaType
from models.messages.extract_download_link_message import ExtractDownloadLinkMessage
from models.messages.response.direct_download_link_extracted import DirectDownloadLinkExtracted
from models.request_consumer_setup import RequestConsumerSetup
from queues.consumers.base_consumer import BaseConsumer
from utils.cookie_provider import EnvCookieProvider

PUBLISHER_EXCHANGE_NAME = 'extract-download-link'
CONSUMER_QUEUE_NAME = 'extract-download-link-consumer'
RESPONSE_MESSAGE_TYPE = "scheme:download-link-extracted"

def extract_link_handler(message: ExtractDownloadLinkMessage):
    input_link = message.media_link
    media_type = message.media_type

    instagram_cookies = EnvCookieProvider(env_variable_name="INSTAGRAM_COOKIES_PATH")
            
    extractor_configs = [
        (InstagramLinkExtractor, {'cookie_provider': instagram_cookies})
    ]
    factory = LinkExtractorFactory(extractor_configs)
    extractor = factory.get_extractor(input_link)

    direct_link = ""
    if media_type == MediaType.Audio:
        direct_link = extractor.get_direct_audio_link(input_link)
    elif media_type == MediaType.Video:
        direct_link = extractor.get_direct_video_link(input_link)
    elif media_type == MediaType.VideoAudio:
        direct_link = extractor.get_direct_video_with_audio_link(input_link)

    result = DirectDownloadLinkExtracted(
        direct_download_link=direct_link
    )

    return result

setup = RequestConsumerSetup(
    publisher_exchange_name=PUBLISHER_EXCHANGE_NAME,
    consumer_queue_name=CONSUMER_QUEUE_NAME
)

responses = {
    DirectDownloadLinkExtracted: RESPONSE_MESSAGE_TYPE
}

extractLinkConsumer = BaseConsumer(
    setup, 
    ExtractDownloadLinkMessage,
    responses,
    extract_link_handler
)


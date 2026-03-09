import logging
from typing import Any
import yt_dlp
import re

from link_extractors.base_link_extractor import BaseLinkExtractor
from utils.cookie_provider import BaseCookieProvider

class InstagramLinkExtractor(BaseLinkExtractor):
    inst_reel_regex = r'^https?://(www\.)?instagram\.com/(reel|p)/[^/?#]+/?'

    def __init__(self, cookie_provider: BaseCookieProvider):
        self.cookie_provider = cookie_provider

    def get_direct_video_link(self, url: str) -> str:
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'forceurl': True,
            'format': 'bestvideo/best',
        }
        return self._get_url(url, ydl_opts)

    def get_direct_audio_link(self, url: str) -> str:
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'forceurl': True,
            'format': 'bestaudio/best',
        }
        return self._get_url(url, ydl_opts)

    def get_direct_video_with_audio_link(self, url: str) -> str:
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'forceurl': True,
            'format': 'best',
        }
        return self._get_url(url, ydl_opts)

    def can_handle(self, url: str) -> bool:
        match = re.search(self.inst_reel_regex, url)
        return bool(match)

    def _get_url(self, url: str, ydl_opts: dict) -> str:
        cookie_path = self.cookie_provider.get_cookie_path()
        if cookie_path:
            ydl_opts['cookies'] = cookie_path
        else:
            logging.warning("Cookies for INST are not specified (this may cause issues)")

        info = None
        try:
            info = self._get_info_with_yt_dlp(url, ydl_opts)
        except Exception as e:
            logging.error(f"Calling yt_dlp caused error {str(e)}")
            raise Exception(f"Calling yt_dlp caused error {str(e)}")

        if not info:
            logging.warning("YT_dlp returned empty info")
            raise Exception("YT_dlp returned empty info")
        res = info.get("url")

        if not res:
            logging.warning(f"Url wasn't presented in info (info body: {info})")
            raise Exception("Url wasn't presented in returned info")
        return res
    
    def _get_info_with_yt_dlp(self, url: str, ydl_opts: dict) -> (dict[str, Any] | None):
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info


import pytest
from unittest.mock import MagicMock, patch

from link_extractors.instagram import InstagramLinkExtractor

@patch('yt_dlp.YoutubeDL')
def test_get_direct_link_with_cookies(mockYtDlp):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = "/fake/path/to/cookies.txt"

    mock_run_result = MagicMock()
    mock_run_result.stdout = "http://direct-video-link.com/video.mp4\n"
    mockYtDlp.return_value.__enter__.return_value.extract_info.return_value = {
        'url': mock_run_result.stdout
    }

    # Act
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)
    result = extractor.get_direct_video_link("http://instagram.com/some_video")

    # Assert
    assert result == mock_run_result.stdout

    mock_cookie_provider.get_cookie_path.assert_called_once()

    call_opts = mockYtDlp.call_args[0][0]
    assert 'cookies' in call_opts
    assert call_opts['cookies'] == "/fake/path/to/cookies.txt"


@patch('yt_dlp.YoutubeDL')
def test_get_direct_link_without_cookies(mockYtDl):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = None 

    mock_run_result = MagicMock()
    mock_run_result.stdout = "http://another-link.com/video.mp4\n"
    mockYtDl.return_value.__enter__.return_value.extract_info.return_value = {
        'url': mock_run_result.stdout
    }

    # Act
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)
    result = extractor.get_direct_video_link("http://instagram.com/some_video")

    # Assert
    assert result == mock_run_result.stdout
    mock_cookie_provider.get_cookie_path.assert_called_once()

    call_opts = mockYtDl.call_args[0][0]
    assert 'cookies' not in call_opts


@patch('yt_dlp.YoutubeDL')
def test_get_direct_link_when_yt_dlp_fails(mockYtDl):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = None

    mockYtDl.return_value.__enter__.return_value.extract_info.side_effect = Exception("Test error")
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)

    # Act & Assert
    
    with pytest.raises(Exception, match="Test error"):
        extractor.get_direct_video_link("http://instagram.com/non_existent_video")

@patch('yt_dlp.YoutubeDL')
def test_get_direct_link_when_yt_dlp_returns_empty_info(mockYtDl):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = None

    mockYtDl.return_value.__enter__.return_value.extract_info = None
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)

    # Act & Assert
    with pytest.raises(Exception):
        extractor.get_direct_video_link("http://instagram.com/some_video")


@patch('yt_dlp.YoutubeDL')
def test_get_direct_video_link_when_yt_dlp_returns_no_url_in_info(mockYtDl):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = None

    mockYtDl.return_value.__enter__.return_value.extract_info.return_value  = {
        "notUrl": ""
    }
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)

    # Act & Assert
    with pytest.raises(Exception):
        extractor.get_direct_video_link("http://instagram.com/some_video")

@patch('yt_dlp.YoutubeDL')
def test_get_direct_video_link_sets_best_quality(mockYtDl):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = None

    mockYtDl.return_value.__enter__.return_value.extract_info.return_value = {
        "url": "url"
    }
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)

    # Act
    extractor.get_direct_video_link("http://instagram.com/some_video")

    # Assert
    mock_cookie_provider.get_cookie_path.assert_called_once()

    call_opts = mockYtDl.call_args[0][0]
    assert 'format' in call_opts
    assert call_opts['format'] == "bestvideo/best"     

@patch('yt_dlp.YoutubeDL')
def test_get_direct_audio_link_sets_best_quality(mockYtDl):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = None

    mockYtDl.return_value.__enter__.return_value.extract_info.return_value = {
        "url": "url"
    }
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)

    # Act
    extractor.get_direct_audio_link("http://instagram.com/some_video")

    # Assert
    mock_cookie_provider.get_cookie_path.assert_called_once()

    call_opts = mockYtDl.call_args[0][0]
    assert 'format' in call_opts
    assert call_opts['format'] == "bestaudio/best"      

@patch('yt_dlp.YoutubeDL')
def test_get_direct_video_with_audio_link_sets_best_quality(mockYtDl):
    # Arrange
    mock_cookie_provider = MagicMock()
    mock_cookie_provider.get_cookie_path.return_value = None

    mockYtDl.return_value.__enter__.return_value.extract_info.return_value = {
        "url": "url"
    }
    extractor = InstagramLinkExtractor(cookie_provider=mock_cookie_provider)

    # Act
    extractor.get_direct_video_with_audio_link("http://instagram.com/some_video")

    # Assert
    mock_cookie_provider.get_cookie_path.assert_called_once()

    call_opts = mockYtDl.call_args[0][0]
    assert 'format' in call_opts
    assert call_opts['format'] == "best"      


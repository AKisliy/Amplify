namespace Publisher.Core.Constants;

public static class InstagramApi
{
    public static class UploadStatus
    {
        public static readonly string Finished = "FINISHED";
        public static readonly string Error = "ERROR";
        public static readonly string InProgress = "IN_PROGRESS";
    }

    public static class MediaType
    {
        public static readonly string Reels = "REELS";
    }

    public static class UploadType
    {
        public static readonly string Resumable = "resumable";
    }

    public static class PayloadFieldName
    {
        public static readonly string AccessToken = "access_token";
        public static readonly string MediaType = "media_type";
        public static readonly string UploadType = "upload_type";
        public static readonly string DisableLikesAndViewsCounts = "disable_likes_and_view_counts";
        public static readonly string Caption = "caption";
        public static readonly string CoverUrl = "cover_url";
        public static readonly string CreationId = "creation_id";
        public static readonly string StatusCode = "status_code";
        public static readonly string ShortCode = "shortcode";
        public static readonly string ShareToFeed = "share_to_feed";
        public static readonly string VideoUrl = "video_url";
    }

    public static class HeaderFieldName
    {
        public static readonly string Authorization = "Authorization";
        public static readonly string UploadFileOffset = "offset";
        public static readonly string UploadFileSize = "file_size";
    }

    public enum ResponseSubcodes
    {
        InstagramServerError = 2207001,
        TimeoutDownloadingMedia = 2207003,
        MediaBuilderExpired = 2207008,
        MediaNotReady = 2207027,
        FailedCreateContainer = 2207032
    }

    public static class ContainerStatusQuery
    {
        public const int DelayMs = 60 * 1000;
        public const int MaxAttempts = 5;
    }
}

using NpgsqlTypes;

namespace Publisher.Core.Enums;

[Flags]
public enum SocialMedia
{
    [PgName("instagram")]
    Instagram = 1,
    [PgName("tik_tok")]
    TikTok = 2,
    [PgName("youtube")]
    Youtube = 4
}

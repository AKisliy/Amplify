using NpgsqlTypes;

namespace Publisher.Core.Enums;

public enum VideoFormat
{
    [PgName("AI-UGC")]
    AIUGC,

    [PgName("Luxury edit")]
    LuxuryEdit
}

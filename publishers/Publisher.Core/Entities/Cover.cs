using Publisher.Core.Common;

namespace Publisher.Core.Entities;

public partial class Cover : BaseEntity<int>
{
    public string FilePath { get; set; } = null!;
}

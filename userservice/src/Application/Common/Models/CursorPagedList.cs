namespace UserService.Application.Common.Models;

public class CursorPagedList<T>
{
    public IReadOnlyList<T> Items { get; }
    public DateTimeOffset? NextCursor { get; }

    public CursorPagedList(IReadOnlyList<T> items, DateTimeOffset? nextCursor)
    {
        Items = items;
        NextCursor = nextCursor;
    }
}

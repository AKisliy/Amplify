namespace Publisher.Application.AutoLists.Queries.GetAutoLists;

public class AutoListsVm
{
    public IReadOnlyCollection<AutoListDto> AutoLists { get; init; } = [];
}

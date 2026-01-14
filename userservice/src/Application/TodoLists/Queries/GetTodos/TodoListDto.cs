using UserService.Domain.Entities;

namespace UserService.Application.TodoLists.Queries.GetTodos;

public class TodoListDto
{
    public int Id { get; init; }

    public string? Title { get; init; }

    public string? Colour { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<TodoList, TodoListDto>();
        }
    }
}

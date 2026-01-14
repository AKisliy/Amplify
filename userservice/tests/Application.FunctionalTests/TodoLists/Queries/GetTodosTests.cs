using UserService.Application.TodoLists.Queries.GetTodos;
using UserService.Domain.Entities;
using UserService.Domain.ValueObjects;

namespace UserService.Application.FunctionalTests.TodoLists.Queries;

using static Testing;

public class GetTodosTests : BaseTestFixture
{
    [Test]
    public async Task ShouldReturnPriorityLevels()
    {
        await RunAsDefaultUserAsync();

        var query = new GetTodosQuery();

        var result = await SendAsync(query);

        result.PriorityLevels.ShouldNotBeEmpty();
    }

    [Test]
    public async Task ShouldReturnAllListsAndItems()
    {
        await RunAsDefaultUserAsync();

        await AddAsync(new TodoList
        {
            Title = "Shopping",
            Colour = Colour.Blue
        });

        var query = new GetTodosQuery();

        var result = await SendAsync(query);

        result.Lists.Count.ShouldBe(1);
    }

    [Test]
    public async Task ShouldDenyAnonymousUser()
    {
        var query = new GetTodosQuery();

        var action = () => SendAsync(query);

        await Should.ThrowAsync<UnauthorizedAccessException>(action);
    }
}

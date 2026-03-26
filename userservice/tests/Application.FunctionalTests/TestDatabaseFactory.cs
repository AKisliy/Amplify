namespace UserService.Application.FunctionalTests;

public static class TestDatabaseFactory
{
    public static async Task<ITestDatabase> CreateAsync()
    {
        var database = new PostgreSqlTestcontainersTestDatabase();

        await database.InitialiseAsync();

        return database;
    }
}

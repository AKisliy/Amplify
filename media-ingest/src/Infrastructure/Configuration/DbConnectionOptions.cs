namespace MediaIngest.Infrastructure.Configuration;

public class DbConnectionOptions
{
    public const string ConfigurationSection = "DbConnection";

    public string Default { get; set; } = string.Empty;
}

public sealed class DbConnectionOptionsValidator : AbstractValidator<DbConnectionOptions>
{
    public DbConnectionOptionsValidator()
    {
        RuleFor(x => x.Default)
            .NotEmpty();
    }
}
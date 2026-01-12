using FluentValidation;

namespace Publisher.Infrastructure.Configuration.Options;

public class DbConnectionOptions
{
    public const string ConfigurationSection = "DbConnectionOptions";

    public string Default { get; set; } = string.Empty;
}

public sealed class DatabaseOptionsValidator : AbstractValidator<DbConnectionOptions>
{
    public DatabaseOptionsValidator()
    {
        RuleFor(x => x.Default)
            .NotEmpty();
    }
}

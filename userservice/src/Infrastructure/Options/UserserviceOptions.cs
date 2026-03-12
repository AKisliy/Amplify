using FluentValidation;

namespace UserService.Infrastructure.Options;

public class UserserviceOptions
{
    public const string SectionName = "UserserviceOptions";

    public string BasePath { get; set; } = string.Empty;
}

internal sealed class UserserviceOptionsValidator : AbstractValidator<UserserviceOptions>
{
    public UserserviceOptionsValidator()
    {
    }
}

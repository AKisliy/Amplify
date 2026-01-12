using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Publisher.Application.Common.Options;

public class FluentValidateOptions<TOptions>
    : IValidateOptions<TOptions>
    where TOptions : class
{
    private readonly IServiceProvider _serviceProvider;
    private readonly string _name;


    public FluentValidateOptions(IServiceProvider serviceProvider, string name)
    {
        _serviceProvider = serviceProvider;
        _name = name;
    }


    public ValidateOptionsResult Validate(string? name, TOptions options)
    {
        if (name is not null && name != _name)
            return ValidateOptionsResult.Skip;

        Guard.Against.Null(options);

        using var scope = _serviceProvider.CreateScope();

        var validator = scope.ServiceProvider.GetRequiredService<IValidator<TOptions>>();

        var result = validator.Validate(options);

        if (result.IsValid)
            return ValidateOptionsResult.Success;

        var validatedType = result.GetType().Name;
        List<string> errors = [];

        foreach (var error in result.Errors)
            errors.Add($"Validation failed for {validatedType}.{error.PropertyName}: {error.ErrorMessage}");

        return ValidateOptionsResult.Fail(errors);
    }
}

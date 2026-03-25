namespace AiGateway.Web.Configuration.Extensions;

public class FluentValidateOptions<TOptions> : IValidateOptions<TOptions>
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

        var errors = result.Errors
            .Select(e => $"Validation failed for {typeof(TOptions).Name}.{e.PropertyName}: {e.ErrorMessage}")
            .ToList();

        return ValidateOptionsResult.Fail(errors);
    }
}

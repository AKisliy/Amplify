namespace AiGateway.Web.Configuration.Extensions;

public static class OptionsBuilderExtensions
{
    public static OptionsBuilder<TOptions> ValidateFluentValidation<TOptions>(
        this OptionsBuilder<TOptions> builder)
        where TOptions : class
    {
        builder.Services.AddSingleton<IValidateOptions<TOptions>>(sp =>
            new FluentValidateOptions<TOptions>(sp, builder.Name));

        return builder;
    }
}

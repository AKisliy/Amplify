namespace MediaIngest.Infrastructure.Configuration;

public class S3Options
{
    public const string ConfigurationSection = "S3";

    public string BucketName { get; set; } = string.Empty;

    public string AccessKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    public string Host { get; set; } = string.Empty;

    public bool UseSsl { get; set; } = false;
}

public sealed class S3OptionsValidator : AbstractValidator<S3Options>
{
    public S3OptionsValidator()
    {
        RuleFor(x => x.BucketName)
            .NotEmpty();

        RuleFor(x => x.AccessKey)
            .NotEmpty();

        RuleFor(x => x.SecretKey)
            .NotEmpty();

        RuleFor(x => x.Host)
            .NotEmpty();
    }
}

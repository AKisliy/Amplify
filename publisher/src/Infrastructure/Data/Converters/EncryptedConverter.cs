namespace Publisher.Infrastructure.Data.Converters;

using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

public class EncryptedConverter : ValueConverter<string, string>
{
    public EncryptedConverter(string keyName)
        : base(
            v => Encrypt(v, keyName),
            v => Decrypt(v, keyName))
    {
    }

    private static string Encrypt(string value, string key)
    {
        var provider = DataProtectionProvider.Create("PublisherApp");
        var protector = provider.CreateProtector(key);

        return protector.Protect(value);
    }

    private static string Decrypt(string value, string key)
    {
        var provider = DataProtectionProvider.Create("PublisherApp");
        var protector = provider.CreateProtector(key);

        return protector.Unprotect(value);
    }
}
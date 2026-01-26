using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Publisher.Infrastructure.Data.Converters;

public class EncryptedConverter : ValueConverter<string, string>
{
    public EncryptedConverter(IDataProtectionProvider provider, string keyName = "DefaultKey")
        : base(
            plainText => provider.CreateProtector(keyName).Protect(plainText),
            cipherText => provider.CreateProtector(keyName).Unprotect(cipherText)
          )
    {
    }
}
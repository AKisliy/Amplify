namespace Publisher.Infrastructure.Data.Converters;

using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

public class EncryptedConverter : ValueConverter<string, string>
{
    public EncryptedConverter(IDataProtector protector)
        : base(
            v => protector.Protect(v),
            v => protector.Unprotect(v))
    {
    }
}
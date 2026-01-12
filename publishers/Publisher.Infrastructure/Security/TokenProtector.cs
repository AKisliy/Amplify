using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Publisher.Application.Common.Interfaces;
using Publisher.Core.Enums;

namespace Publisher.Infrastructure.Security;

public class TokenProtector(
    IDataProtectionProvider dataProtectionProvider,
    ILogger<TokenProtector> logger) : ITokenProtector
{
    private IDataProtector GetProtector(SocialMedia socialMedia)
    {
        return dataProtectionProvider.CreateProtector($"{socialMedia}AccessToken");
    }

    public string Protect(string plainToken, SocialMedia platform)
    {
        return GetProtector(platform).Protect(plainToken);
    }

    public string? Unprotect(string protectedToken, SocialMedia platform)
    {
        try
        {
            return GetProtector(platform).Unprotect(protectedToken);
        }
        catch (CryptographicException ex)
        {
            logger.LogError(ex, "Error while unprotecting token for {Platform}", platform);
            return null;
        }
    }
}
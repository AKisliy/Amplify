using Publisher.Core.Enums;

namespace Publisher.Application.Common.Interfaces;

public interface ITokenProtector
{
    string Protect(string plainToken, SocialMedia socialMedia);
    string? Unprotect(string protectedToken, SocialMedia socialMedia);
}

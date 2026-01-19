using Microsoft.Extensions.Options;
using UserService.Application.Auth.ConfirmEmail;
using UserService.Application.Auth.Login;
using UserService.Application.Auth.Password;
using UserService.Application.Auth.Refresh;
using UserService.Application.Auth.Register;
using UserService.Application.Common.Interfaces;
using UserService.Application.Common.Options;
using UserService.Infrastructure.Options;

namespace UserService.Web.Endpoints;

public class Auth : EndpointGroupBase
{
    public override string? GroupName => "auth";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("register", async (ISender sender, RegisterUserCommand command) =>
        {
            await sender.Send(command);
            return Results.Ok();
        });

        groupBuilder.MapGet("confirm-email", async (
            ISender sender,
            IOptions<FrontendOptions> frontendOptions,
            [AsParameters] ConfirmEmailCommand command) =>
        {
            await sender.Send(command);
            return Results.Ok();
        });

        groupBuilder.MapPost(LoginUser, "login");

        groupBuilder.MapPost(RefreshToken, "refresh");

        groupBuilder.MapPost("forgot-password", async (ISender sender, ForgotPasswordCommand command) =>
        {
            await sender.Send(command);
            return Results.Ok();
        });

        groupBuilder.MapPost("reset-password", async (ISender sender, ResetPasswordCommand command) =>
        {
            await sender.Send(command);
            return Results.Ok();
        });

        groupBuilder.MapGet(".well-known/jwks.json", (ITokenService tokenService) => Results.Ok(tokenService.GetJwks())).AllowAnonymous();
    }

    private static async Task<IResult> LoginUser(
        ISender sender,
        IOptions<MyCookiesOptions> cookieOptions,
        LoginUserCommand command,
        HttpContext context)
    {
        var result = await sender.Send(command);

        AppendTokenCookies(context, cookieOptions.Value, result.AccessToken, result.RefreshToken);

        return Results.Ok(new { Message = "Login successful" });
    }

    private static async Task<IResult> RefreshToken(
        ISender sender,
        IOptions<MyCookiesOptions> cookieOptions,
        HttpContext context)
    {
        if (!context.Request.Cookies.TryGetValue(cookieOptions.Value.RefreshTokenCookieName, out var incomingRefreshToken) ||
            !context.Request.Cookies.TryGetValue(cookieOptions.Value.AccessTokenCookieName, out var incomingAccessToken) ||
            string.IsNullOrEmpty(incomingRefreshToken) || string.IsNullOrEmpty(incomingAccessToken))
        {
            return Results.Unauthorized();
        }

        var command = new RefreshTokenCommand(incomingAccessToken, incomingRefreshToken);
        var result = await sender.Send(command);

        AppendTokenCookies(context, cookieOptions.Value, result.AccessToken, result.RefreshToken);

        return Results.Ok();
    }

    private static void AppendTokenCookies(
        HttpContext context,
        MyCookiesOptions myCookiesOptions,
        string accessToken,
        string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            // In production, set Secure to true
            Secure = false,
            SameSite = SameSiteMode.None,
            Expires = DateTime.UtcNow.AddDays(30)
        };

        context.Response.Cookies.Append(myCookiesOptions.AccessTokenCookieName, accessToken, cookieOptions);
        context.Response.Cookies.Append(myCookiesOptions.RefreshTokenCookieName, refreshToken, cookieOptions);
    }
}

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;
using UserService.Application.Auth.ConfirmEmail;
using UserService.Application.Auth.Login;
using UserService.Application.Auth.Logout;
using UserService.Application.Auth.Models;
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
        groupBuilder.MapPost("logout", async (ISender sender) =>
        {
            var command = new LogoutCommand();
            await sender.Send(command);
            return Results.Ok();
        }).RequireAuthorization();

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

        groupBuilder.MapGet(
            ".well-known/jwks.json",
            (ITokenService tokenService) => Results.Ok(tokenService.GetJwks()))
            .AllowAnonymous()
            .WithName("JWKS");

        groupBuilder.MapGet(".well-known/openid-configuration", (
            ITokenService tokenService,
            LinkGenerator linkGenerator,
            IOptions<JwtOptions> jwtOptions,
            HttpContext httpContext) =>
        {
            var issuer = jwtOptions.Value.Issuer;
            var jwksUri = linkGenerator.GetUriByName(httpContext, "JWKS");

            Guard.Against.Null(jwksUri);

            return Results.Ok(new MinimalOpenIdConfiguration
            {
                JwksUri = jwksUri,
                Issuer = issuer
            });
        }).AllowAnonymous();
    }

    private static async Task<Ok<LoginResponse>> LoginUser(
        ISender sender,
        IOptions<MyCookiesOptions> cookieOptions,
        LoginUserCommand command,
        HttpContext context)
    {
        var result = await sender.Send(command);

        return TypedResults.Ok(result);
    }

    private static async Task<Ok<LoginResponse>> RefreshToken(
        RefreshTokenCommand request,
        ISender sender,
        IOptions<MyCookiesOptions> cookieOptions,
        HttpContext context)
    {
        Guard.Against.NullOrEmpty(request.AccessToken, nameof(request.AccessToken));
        Guard.Against.NullOrEmpty(request.RefreshToken, nameof(request.RefreshToken));

        var result = await sender.Send(request);
        return TypedResults.Ok(result);
    }
}

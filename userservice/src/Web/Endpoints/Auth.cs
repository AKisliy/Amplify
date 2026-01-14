using UserService.Application.Auth.ConfirmEmail;
using UserService.Application.Auth.Login;
using UserService.Application.Auth.Password;
using UserService.Application.Auth.Refresh;
using UserService.Application.Auth.Register;
using UserService.Application.Common.Interfaces;

namespace UserService.Web.Endpoints;

public class Auth : EndpointGroupBase
{
    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("register", async (ISender sender, RegisterUserCommand command) =>
        {
            await sender.Send(command);
            return Results.Ok();
        });

        groupBuilder.MapGet("confirmEmail", async (ISender sender, [AsParameters] ConfirmEmailCommand command) =>
        {
            await sender.Send(command);
            // Лучше делать редирект на страницу "Успех" на фронте
            // return Results.Redirect("https://myapp.com/email-confirmed"); 
            return Results.Ok("Email confirmed successfully");
        });

        groupBuilder.MapPost("login", async (ISender sender, LoginUserCommand command) =>
        {
            var result = await sender.Send(command);
            return Results.Ok(result);
        });

        groupBuilder.MapPost("refresh", async (ISender sender, RefreshTokenCommand command) =>
        {
            var result = await sender.Send(command);
            return Results.Ok(result);
        });

        groupBuilder.MapPost("forgotPassword", async (ISender sender, ForgotPasswordCommand command) =>
        {
            await sender.Send(command);
            return Results.Ok();
        });

        groupBuilder.MapPost("resetPassword", async (ISender sender, ResetPasswordCommand command) =>
        {
            await sender.Send(command);
            return Results.Ok();
        });

        groupBuilder.MapGet(".well-known/jwks.json", (ITokenService tokenService) => Results.Ok(tokenService.GetJwks())).AllowAnonymous();
    }
}

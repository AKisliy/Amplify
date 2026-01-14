using UserService.Application.Auth.ConfirmEmail;
using UserService.Application.Auth.Login;
using UserService.Application.Auth.Register;

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
    }
}

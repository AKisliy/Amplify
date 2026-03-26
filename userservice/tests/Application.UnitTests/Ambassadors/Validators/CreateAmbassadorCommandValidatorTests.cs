using UserService.Application.Ambassadors.Commands.CreateAmbassador;

namespace UserService.Application.UnitTests.Ambassadors.Validators;

[TestFixture]
public class CreateAmbassadorCommandValidatorTests
{
    private CreateAmbassadorCommandValidator _validator = null!;

    [SetUp]
    public void SetUp()
    {
        _validator = new CreateAmbassadorCommandValidator();
    }

    [Test]
    public async Task FailsWhenNameIsEmpty()
    {
        var result = await _validator.ValidateAsync(
            new CreateAmbassadorCommand("", null, null, null, Guid.NewGuid()));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == "Name");
    }

    [Test]
    public async Task FailsWhenNameExceedsMaxLength()
    {
        var longName = new string('A', 201);

        var result = await _validator.ValidateAsync(
            new CreateAmbassadorCommand(longName, null, null, null, Guid.NewGuid()));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == "Name");
    }

    [Test]
    public async Task FailsWhenBiographyExceedsMaxLength()
    {
        var longBio = new string('B', 2001);

        var result = await _validator.ValidateAsync(
            new CreateAmbassadorCommand("Alice", longBio, null, null, Guid.NewGuid()));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == "Biography");
    }

    [Test]
    public async Task FailsWhenProjectIdIsEmpty()
    {
        var result = await _validator.ValidateAsync(
            new CreateAmbassadorCommand("Alice", null, null, null, Guid.Empty));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == "ProjectId");
    }

    [Test]
    public async Task PassesWithValidData()
    {
        var result = await _validator.ValidateAsync(
            new CreateAmbassadorCommand("Alice", "Bio", "Patterns", "Voice", Guid.NewGuid()));

        result.IsValid.ShouldBeTrue();
    }
}

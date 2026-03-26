using UserService.Application.Projects.Commands.CreateProject;

namespace UserService.Application.UnitTests.Projects.Validators;

[TestFixture]
public class CreateProjectCommandValidatorTests
{
    private Mock<IApplicationDbContext> _dbContext = null!;
    private Mock<IUser> _user = null!;
    private CreateProjectCommandValidator _validator = null!;

    private static readonly Guid UserId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _dbContext = new Mock<IApplicationDbContext>();
        _user = new Mock<IUser>();
        _user.SetupGet(u => u.Id).Returns(UserId);

        _validator = new CreateProjectCommandValidator(_dbContext.Object, _user.Object);
    }

    [Test]
    public async Task FailsWhenNameIsEmpty()
    {
        SetupProjects([]);

        var result = await _validator.ValidateAsync(new CreateProjectCommand("", null, null));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.PropertyName == "Name");
    }

    [Test]
    public async Task FailsWhenNameAlreadyExistsForUser()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "Existing", UserId = UserId };
        SetupProjects([project]);

        var result = await _validator.ValidateAsync(new CreateProjectCommand("Existing", null, null));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.ErrorCode == "Unique");
    }

    [Test]
    public async Task PassesWhenNameIsUniqueForUser()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "Other Name", UserId = UserId };
        SetupProjects([project]);

        var result = await _validator.ValidateAsync(new CreateProjectCommand("New Name", null, null));

        result.IsValid.ShouldBeTrue();
    }

    [Test]
    public async Task PassesWhenSameNameBelongsToAnotherUser()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "Taken", UserId = Guid.NewGuid() };
        SetupProjects([project]);

        var result = await _validator.ValidateAsync(new CreateProjectCommand("Taken", null, null));

        result.IsValid.ShouldBeTrue();
    }

    private void SetupProjects(List<Project> projects)
    {
        var mockSet = projects.AsQueryable().BuildMockDbSet();
        _dbContext.Setup(c => c.Projects).Returns(mockSet.Object);
    }
}

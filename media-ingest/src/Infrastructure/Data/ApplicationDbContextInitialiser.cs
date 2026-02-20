using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MediaIngest.Infrastructure.Data;

public static class InitialiserExtensions
{
    public static async Task InitialiseDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();

        if (app.Environment.IsDevelopment())
        {
            await initialiser.InitialiseAsync();
            await initialiser.TrySeedAsync();
        }
    }
}

public class ApplicationDbContextInitialiser(
    ILogger<ApplicationDbContextInitialiser> logger,
    ApplicationDbContext context,
    IFileStorage fileStorage)
{
    public async Task InitialiseAsync()
    {
        try
        {
            // See https://jasontaylor.dev/ef-core-database-initialisation-strategies
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while initialising the database.");
            throw;
        }
    }

    public async Task TrySeedAsync()
    {
        try
        {
            await SeedAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
        }
    }

    private async Task SeedAsync()
    {
        // Seed, if necessary
        if (!context.MediaFiles.Any())
        {
            var basePath = AppContext.BaseDirectory;
            var imagePath = Path.Combine(basePath, "assets", "samples", "sample-image.jpg");

            var imageFile = File.OpenRead(imagePath);
            var mediaKey = "sample-file-key.jpg";

            var mediaFileId = new Guid("5ee06455-ef52-453f-8cb4-33a028567c28");
            var mediaFile = new MediaFile
            {
                Id = mediaFileId,
                FileKey = mediaKey,
                OriginalFileName = "sample-image.jpg",
                ContentType = "image/jpeg",
                FileSize = imageFile.Length
            };

            context.MediaFiles.Add(mediaFile);

            await fileStorage.SaveFileAsync(imageFile, mediaKey);

            await context.SaveChangesAsync();

            logger.LogInformation("Seeded database with sample media file with ID: {MediaFileId}", mediaFileId);
        }
    }
}

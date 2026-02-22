using MediaIngest.Application.Common.Interfaces;
using MediaIngest.Domain.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
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
    private const string DevJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6ImY1MTdhNjdjLTAyYjEtNDcxMC05YjM1LTA0OTJiMDI5ZDBjNCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6ImZyb250ZW5kQGRldi5sb2NhbCIsInJvbGUiOiJBZG1pbiIsImV4cCI6NDkyNTcyNzQ4MSwiaXNzIjoiZGV2LWxvY2FsIiwiYXVkIjoicHVibGlzaGVyLWFwaSJ9.UrSq4n_bP-UYX5bZdR81RvhncRm4uOod4ljEqkjGDW0";

    public async Task InitialiseAsync()
    {
        try
        {
            await context.Database.MigrateAsync();
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

        logger.LogInformation("Your default JWT token (expires in 100 years, for testing ONLY): {JwtToken}", DevJwt);
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediaIngest.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddThumbnailsToMediaFileEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "thumbnail_medium_key",
                schema: "media_ingest",
                table: "media_files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "thumbnail_tiny_key",
                schema: "media_ingest",
                table: "media_files",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "thumbnail_medium_key",
                schema: "media_ingest",
                table: "media_files");

            migrationBuilder.DropColumn(
                name: "thumbnail_tiny_key",
                schema: "media_ingest",
                table: "media_files");
        }
    }
}

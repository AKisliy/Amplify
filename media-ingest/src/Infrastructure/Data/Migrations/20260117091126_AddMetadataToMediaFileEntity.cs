using MediaIngest.Domain.Enums;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediaIngest.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMetadataToMediaFileEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "file_type",
                table: "media_files");

            migrationBuilder.AddColumn<string>(
                name: "content_type",
                table: "media_files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "file_size",
                table: "media_files",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "original_file_name",
                table: "media_files",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "content_type",
                table: "media_files");

            migrationBuilder.DropColumn(
                name: "file_size",
                table: "media_files");

            migrationBuilder.DropColumn(
                name: "original_file_name",
                table: "media_files");

            migrationBuilder.AddColumn<FileType>(
                name: "file_type",
                table: "media_files",
                type: "file_type",
                nullable: true);
        }
    }
}

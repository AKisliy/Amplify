using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MovePublicationSettingsToPublicationRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "publication_settings",
                schema: "publisher",
                table: "media_posts");

            migrationBuilder.AddColumn<string>(
                name: "publication_settings",
                schema: "publisher",
                table: "publication_records",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "publication_settings",
                schema: "publisher",
                table: "publication_records");

            migrationBuilder.AddColumn<string>(
                name: "publication_settings",
                schema: "publisher",
                table: "media_posts",
                type: "jsonb",
                nullable: false,
                defaultValue: "{}");
        }
    }
}

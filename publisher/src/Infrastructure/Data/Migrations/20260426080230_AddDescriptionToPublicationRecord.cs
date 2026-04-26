using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDescriptionToPublicationRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                schema: "publisher",
                table: "media_posts");

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "publisher",
                table: "publication_records",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                schema: "publisher",
                table: "publication_records");

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "publisher",
                table: "media_posts",
                type: "text",
                nullable: true);
        }
    }
}

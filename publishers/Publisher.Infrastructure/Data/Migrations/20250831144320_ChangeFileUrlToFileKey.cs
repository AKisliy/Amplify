using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ChangeFileUrlToFileKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "file_url",
                table: "created_posts",
                newName: "file_key");

            migrationBuilder.RenameColumn(
                name: "cover_url",
                table: "created_posts",
                newName: "cover_file_key");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "file_key",
                table: "created_posts",
                newName: "file_url");

            migrationBuilder.RenameColumn(
                name: "cover_file_key",
                table: "created_posts",
                newName: "cover_url");
        }
    }
}

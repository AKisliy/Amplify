using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedPosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "last_published_post_id",
                table: "post_containers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "created_posts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    cover_url = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    post_container_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_created_posts", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_post_containers_last_published_post_id",
                table: "post_containers",
                column: "last_published_post_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_post_containers_created_posts_last_published_post_id",
                table: "post_containers",
                column: "last_published_post_id",
                principalTable: "created_posts",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_post_containers_created_posts_last_published_post_id",
                table: "post_containers");

            migrationBuilder.DropTable(
                name: "created_posts");

            migrationBuilder.DropIndex(
                name: "ix_post_containers_last_published_post_id",
                table: "post_containers");

            migrationBuilder.DropColumn(
                name: "last_published_post_id",
                table: "post_containers");
        }
    }
}

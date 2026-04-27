using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UserService.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAmbassadorFromUserService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ambassador_images",
                schema: "userservice");

            migrationBuilder.DropTable(
                name: "ambassadors",
                schema: "userservice");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ambassadors",
                schema: "userservice",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    behavioral_patterns = table.Column<string>(type: "text", nullable: true),
                    biography = table.Column<string>(type: "text", nullable: true),
                    created = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_modified = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_modified_by = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    profile_image_id = table.Column<Guid>(type: "uuid", nullable: true),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    voice_description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ambassadors", x => x.id);
                    table.ForeignKey(
                        name: "fk_ambassadors_projects_project_id",
                        column: x => x.project_id,
                        principalSchema: "userservice",
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ambassador_images",
                schema: "userservice",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ambassador_id = table.Column<Guid>(type: "uuid", nullable: false),
                    image_type = table.Column<int>(type: "integer", nullable: false),
                    media_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ambassador_images", x => x.id);
                    table.ForeignKey(
                        name: "fk_ambassador_images_ambassadors_ambassador_id",
                        column: x => x.ambassador_id,
                        principalSchema: "userservice",
                        principalTable: "ambassadors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_ambassador_images_ambassador_id",
                schema: "userservice",
                table: "ambassador_images",
                column: "ambassador_id");

            migrationBuilder.CreateIndex(
                name: "ix_ambassadors_project_id",
                schema: "userservice",
                table: "ambassadors",
                column: "project_id",
                unique: true);
        }
    }
}

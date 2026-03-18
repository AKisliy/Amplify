using System;
using Microsoft.EntityFrameworkCore.Migrations;
using UserService.Domain.Enums;

#nullable disable

namespace UserService.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAssets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:userservice.asset_lifetime", "intermediate,permanent");

            migrationBuilder.CreateTable(
                name: "project_assets",
                schema: "userservice",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    media_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lifetime = table.Column<AssetLifetime>(type: "userservice.asset_lifetime", nullable: false),
                    created = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_modified = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_modified_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project_assets", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_assets_projects_project_id",
                        column: x => x.project_id,
                        principalSchema: "userservice",
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_project_assets_project_id",
                schema: "userservice",
                table: "project_assets",
                column: "project_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_assets",
                schema: "userservice");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:Enum:userservice.asset_lifetime", "intermediate,permanent");
        }
    }
}

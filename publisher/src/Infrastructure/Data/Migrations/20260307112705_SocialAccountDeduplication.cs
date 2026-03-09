using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SocialAccountDeduplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_social_accounts_projects_project_id",
                schema: "publisher",
                table: "social_accounts");

            migrationBuilder.DropIndex(
                name: "ix_social_accounts_project_id",
                schema: "publisher",
                table: "social_accounts");

            migrationBuilder.DropColumn(
                name: "project_id",
                schema: "publisher",
                table: "social_accounts");

            migrationBuilder.AddColumn<string>(
                name: "provider_user_id",
                schema: "publisher",
                table: "social_accounts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "project_social_account",
                schema: "publisher",
                columns: table => new
                {
                    projects_id = table.Column<Guid>(type: "uuid", nullable: false),
                    social_accounts_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project_social_account", x => new { x.projects_id, x.social_accounts_id });
                    table.ForeignKey(
                        name: "fk_project_social_account_projects_projects_id",
                        column: x => x.projects_id,
                        principalSchema: "publisher",
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_project_social_account_social_accounts_social_accounts_id",
                        column: x => x.social_accounts_id,
                        principalSchema: "publisher",
                        principalTable: "social_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_social_accounts_provider_provider_user_id",
                schema: "publisher",
                table: "social_accounts",
                columns: new[] { "provider", "provider_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_project_social_account_social_accounts_id",
                schema: "publisher",
                table: "project_social_account",
                column: "social_accounts_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_social_account",
                schema: "publisher");

            migrationBuilder.DropIndex(
                name: "ix_social_accounts_provider_provider_user_id",
                schema: "publisher",
                table: "social_accounts");

            migrationBuilder.DropColumn(
                name: "provider_user_id",
                schema: "publisher",
                table: "social_accounts");

            migrationBuilder.AddColumn<Guid>(
                name: "project_id",
                schema: "publisher",
                table: "social_accounts",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "ix_social_accounts_project_id",
                schema: "publisher",
                table: "social_accounts",
                column: "project_id");

            migrationBuilder.AddForeignKey(
                name: "fk_social_accounts_projects_project_id",
                schema: "publisher",
                table: "social_accounts",
                column: "project_id",
                principalSchema: "publisher",
                principalTable: "projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

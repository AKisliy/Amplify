using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MakeSocialMediaAccountToAutoListManyToMany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_social_media_accounts_auto_lists_auto_list_id",
                table: "social_media_accounts");

            migrationBuilder.DropIndex(
                name: "ix_social_media_accounts_auto_list_id",
                table: "social_media_accounts");

            migrationBuilder.DropColumn(
                name: "auto_list_id",
                table: "social_media_accounts");

            migrationBuilder.CreateTable(
                name: "auto_list_social_media_account",
                columns: table => new
                {
                    accounts_id = table.Column<Guid>(type: "uuid", nullable: false),
                    auto_lists_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auto_list_social_media_account", x => new { x.accounts_id, x.auto_lists_id });
                    table.ForeignKey(
                        name: "fk_auto_list_social_media_account_auto_lists_auto_lists_id",
                        column: x => x.auto_lists_id,
                        principalTable: "auto_lists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_auto_list_social_media_account_social_media_accounts_accoun",
                        column: x => x.accounts_id,
                        principalTable: "social_media_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_auto_list_social_media_account_auto_lists_id",
                table: "auto_list_social_media_account",
                column: "auto_lists_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auto_list_social_media_account");

            migrationBuilder.AddColumn<Guid>(
                name: "auto_list_id",
                table: "social_media_accounts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_social_media_accounts_auto_list_id",
                table: "social_media_accounts",
                column: "auto_list_id");

            migrationBuilder.AddForeignKey(
                name: "fk_social_media_accounts_auto_lists_auto_list_id",
                table: "social_media_accounts",
                column: "auto_list_id",
                principalTable: "auto_lists",
                principalColumn: "id");
        }
    }
}

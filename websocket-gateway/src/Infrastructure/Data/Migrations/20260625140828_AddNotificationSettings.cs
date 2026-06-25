using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebSocketGateway.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "wsgateway");

            migrationBuilder.CreateTable(
                name: "notification_settings",
                schema: "wsgateway",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    telegram_chat_id = table.Column<long>(type: "bigint", nullable: true),
                    telegram_username = table.Column<string>(type: "text", nullable: true),
                    notify_only_when_offline = table.Column<bool>(type: "boolean", nullable: false),
                    notify_on_error = table.Column<bool>(type: "boolean", nullable: false),
                    notify_on_hitl = table.Column<bool>(type: "boolean", nullable: false),
                    notify_on_completion = table.Column<bool>(type: "boolean", nullable: false),
                    notify_on_publication = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_notification_settings", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_notification_settings_user_id",
                schema: "wsgateway",
                table: "notification_settings",
                column: "user_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "notification_settings",
                schema: "wsgateway");
        }
    }
}

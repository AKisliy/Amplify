using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAvatarMediaIdToSocialAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "avatar_media_id",
                schema: "publisher",
                table: "social_accounts",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "avatar_media_id",
                schema: "publisher",
                table: "social_accounts");
        }
    }
}

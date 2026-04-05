using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AutoListScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "processed_in_auto_list",
                schema: "publisher",
                table: "media_posts");

            migrationBuilder.DropColumn(
                name: "publication_type",
                schema: "publisher",
                table: "media_posts");

            migrationBuilder.AddColumn<Guid>(
                name: "auto_list_entry_id",
                schema: "publisher",
                table: "publication_records",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "publication_type",
                schema: "publisher",
                table: "publication_records",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "published_at",
                schema: "publisher",
                table: "publication_records",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "scheduled_at",
                schema: "publisher",
                table: "publication_records",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "auto_list_entry_id",
                schema: "publisher",
                table: "publication_records");

            migrationBuilder.DropColumn(
                name: "publication_type",
                schema: "publisher",
                table: "publication_records");

            migrationBuilder.DropColumn(
                name: "published_at",
                schema: "publisher",
                table: "publication_records");

            migrationBuilder.DropColumn(
                name: "scheduled_at",
                schema: "publisher",
                table: "publication_records");

            migrationBuilder.AddColumn<bool>(
                name: "processed_in_auto_list",
                schema: "publisher",
                table: "media_posts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "publication_type",
                schema: "publisher",
                table: "media_posts",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}

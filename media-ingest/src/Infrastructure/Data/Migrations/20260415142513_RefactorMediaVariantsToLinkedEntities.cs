using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediaIngest.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefactorMediaVariantsToLinkedEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "thumbnail_medium_key",
                schema: "media_ingest",
                table: "media_files");

            migrationBuilder.DropColumn(
                name: "thumbnail_tiny_key",
                schema: "media_ingest",
                table: "media_files");

            migrationBuilder.AddColumn<Guid>(
                name: "parent_media_id",
                schema: "media_ingest",
                table: "media_files",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "variant",
                schema: "media_ingest",
                table: "media_files",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_media_files_parent_media_id_variant",
                schema: "media_ingest",
                table: "media_files",
                columns: new[] { "parent_media_id", "variant" },
                unique: true,
                filter: "parent_media_id IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "fk_media_files_media_files_parent_media_id",
                schema: "media_ingest",
                table: "media_files",
                column: "parent_media_id",
                principalSchema: "media_ingest",
                principalTable: "media_files",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_media_files_media_files_parent_media_id",
                schema: "media_ingest",
                table: "media_files");

            migrationBuilder.DropIndex(
                name: "ix_media_files_parent_media_id_variant",
                schema: "media_ingest",
                table: "media_files");

            migrationBuilder.DropColumn(
                name: "parent_media_id",
                schema: "media_ingest",
                table: "media_files");

            migrationBuilder.DropColumn(
                name: "variant",
                schema: "media_ingest",
                table: "media_files");

            migrationBuilder.AddColumn<string>(
                name: "thumbnail_medium_key",
                schema: "media_ingest",
                table: "media_files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "thumbnail_tiny_key",
                schema: "media_ingest",
                table: "media_files",
                type: "text",
                nullable: true);
        }
    }
}

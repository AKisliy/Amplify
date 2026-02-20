using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediaIngest.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "media_ingest");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:file_type", "broll,hook,luxury_fragment,luxury_reference,voiceover")
                .Annotation("Npgsql:Enum:media_type", "audio,video,video_audio");

            migrationBuilder.CreateTable(
                name: "media_files",
                schema: "media_ingest",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_key = table.Column<string>(type: "text", nullable: false),
                    original_file_name = table.Column<string>(type: "text", nullable: true),
                    content_type = table.Column<string>(type: "text", nullable: true),
                    file_size = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_media_files", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "media_files",
                schema: "media_ingest");
        }
    }
}

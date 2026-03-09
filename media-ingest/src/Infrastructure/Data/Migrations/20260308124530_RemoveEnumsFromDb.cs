using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediaIngest.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveEnumsFromDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:Enum:file_type", "broll,hook,luxury_fragment,luxury_reference,voiceover")
                .OldAnnotation("Npgsql:Enum:media_type", "audio,video,video_audio");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:file_type", "broll,hook,luxury_fragment,luxury_reference,voiceover")
                .Annotation("Npgsql:Enum:media_type", "audio,video,video_audio");
        }
    }
}

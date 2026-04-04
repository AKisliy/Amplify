using Microsoft.EntityFrameworkCore.Migrations;
using UserService.Domain.Enums;

#nullable disable

namespace UserService.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaTypeToProjectAsset : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:userservice.asset_lifetime", "intermediate,permanent")
                .Annotation("Npgsql:Enum:userservice.asset_media_type", "image,video")
                .OldAnnotation("Npgsql:Enum:userservice.asset_lifetime", "intermediate,permanent");

            migrationBuilder.AddColumn<AssetMediaType>(
                name: "media_type",
                schema: "userservice",
                table: "project_assets",
                type: "userservice.asset_media_type",
                nullable: false,
                defaultValue: AssetMediaType.Image);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "media_type",
                schema: "userservice",
                table: "project_assets");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:userservice.asset_lifetime", "intermediate,permanent")
                .OldAnnotation("Npgsql:Enum:userservice.asset_lifetime", "intermediate,permanent")
                .OldAnnotation("Npgsql:Enum:userservice.asset_media_type", "image,video");
        }
    }
}

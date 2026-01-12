using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAllSetsToContext : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_auto_list_entry_auto_lists_auto_list_id",
                table: "auto_list_entry");

            migrationBuilder.DropForeignKey(
                name: "fk_auto_lists_actor_actor_id",
                table: "auto_lists");

            migrationBuilder.DropForeignKey(
                name: "fk_instagram_publishing_preset_auto_lists_auto_list_id",
                table: "instagram_publishing_preset");

            migrationBuilder.DropForeignKey(
                name: "fk_post_containers_actor_actor_id",
                table: "post_containers");

            migrationBuilder.DropForeignKey(
                name: "fk_social_media_accounts_actor_actor_id",
                table: "social_media_accounts");

            migrationBuilder.DropPrimaryKey(
                name: "pk_instagram_publishing_preset",
                table: "instagram_publishing_preset");

            migrationBuilder.DropPrimaryKey(
                name: "pk_auto_list_entry",
                table: "auto_list_entry");

            migrationBuilder.DropPrimaryKey(
                name: "pk_actor",
                table: "actor");

            migrationBuilder.RenameTable(
                name: "instagram_publishing_preset",
                newName: "instagram_publishing_presets");

            migrationBuilder.RenameTable(
                name: "auto_list_entry",
                newName: "auto_list_entries");

            migrationBuilder.RenameTable(
                name: "actor",
                newName: "actors");

            migrationBuilder.RenameIndex(
                name: "ix_instagram_publishing_preset_auto_list_id",
                table: "instagram_publishing_presets",
                newName: "ix_instagram_publishing_presets_auto_list_id");

            migrationBuilder.RenameIndex(
                name: "ix_auto_list_entry_auto_list_id",
                table: "auto_list_entries",
                newName: "ix_auto_list_entries_auto_list_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_instagram_publishing_presets",
                table: "instagram_publishing_presets",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_auto_list_entries",
                table: "auto_list_entries",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_actors",
                table: "actors",
                column: "id");

            migrationBuilder.CreateTable(
                name: "covers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_path = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_covers", x => x.id);
                });

            migrationBuilder.AddForeignKey(
                name: "fk_auto_list_entries_auto_lists_auto_list_id",
                table: "auto_list_entries",
                column: "auto_list_id",
                principalTable: "auto_lists",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_auto_lists_actors_actor_id",
                table: "auto_lists",
                column: "actor_id",
                principalTable: "actors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_instagram_publishing_presets_auto_lists_auto_list_id",
                table: "instagram_publishing_presets",
                column: "auto_list_id",
                principalTable: "auto_lists",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_post_containers_actors_actor_id",
                table: "post_containers",
                column: "actor_id",
                principalTable: "actors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_social_media_accounts_actors_actor_id",
                table: "social_media_accounts",
                column: "actor_id",
                principalTable: "actors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_auto_list_entries_auto_lists_auto_list_id",
                table: "auto_list_entries");

            migrationBuilder.DropForeignKey(
                name: "fk_auto_lists_actors_actor_id",
                table: "auto_lists");

            migrationBuilder.DropForeignKey(
                name: "fk_instagram_publishing_presets_auto_lists_auto_list_id",
                table: "instagram_publishing_presets");

            migrationBuilder.DropForeignKey(
                name: "fk_post_containers_actors_actor_id",
                table: "post_containers");

            migrationBuilder.DropForeignKey(
                name: "fk_social_media_accounts_actors_actor_id",
                table: "social_media_accounts");

            migrationBuilder.DropTable(
                name: "covers");

            migrationBuilder.DropPrimaryKey(
                name: "pk_instagram_publishing_presets",
                table: "instagram_publishing_presets");

            migrationBuilder.DropPrimaryKey(
                name: "pk_auto_list_entries",
                table: "auto_list_entries");

            migrationBuilder.DropPrimaryKey(
                name: "pk_actors",
                table: "actors");

            migrationBuilder.RenameTable(
                name: "instagram_publishing_presets",
                newName: "instagram_publishing_preset");

            migrationBuilder.RenameTable(
                name: "auto_list_entries",
                newName: "auto_list_entry");

            migrationBuilder.RenameTable(
                name: "actors",
                newName: "actor");

            migrationBuilder.RenameIndex(
                name: "ix_instagram_publishing_presets_auto_list_id",
                table: "instagram_publishing_preset",
                newName: "ix_instagram_publishing_preset_auto_list_id");

            migrationBuilder.RenameIndex(
                name: "ix_auto_list_entries_auto_list_id",
                table: "auto_list_entry",
                newName: "ix_auto_list_entry_auto_list_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_instagram_publishing_preset",
                table: "instagram_publishing_preset",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_auto_list_entry",
                table: "auto_list_entry",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_actor",
                table: "actor",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_auto_list_entry_auto_lists_auto_list_id",
                table: "auto_list_entry",
                column: "auto_list_id",
                principalTable: "auto_lists",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_auto_lists_actor_actor_id",
                table: "auto_lists",
                column: "actor_id",
                principalTable: "actor",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_instagram_publishing_preset_auto_lists_auto_list_id",
                table: "instagram_publishing_preset",
                column: "auto_list_id",
                principalTable: "auto_lists",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_post_containers_actor_actor_id",
                table: "post_containers",
                column: "actor_id",
                principalTable: "actor",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_social_media_accounts_actor_actor_id",
                table: "social_media_accounts",
                column: "actor_id",
                principalTable: "actor",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

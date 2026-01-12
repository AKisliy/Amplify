using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Publisher.Core.Enums;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:publication_status", "failed,published,scheduled")
                .Annotation("Npgsql:Enum:social_media", "instagram,tik_tok,youtube")
                .Annotation("Npgsql:Enum:video_format", "AI-UGC,Luxury edit");

            migrationBuilder.CreateTable(
                name: "actor",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_actor", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "published_videos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_video_id = table.Column<Guid>(type: "uuid", nullable: false),
                    social_media = table.Column<SocialMedia>(type: "social_media", nullable: false),
                    link_text = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<PublicationStatus>(type: "publication_status", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_published_videos", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "auto_lists",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auto_lists", x => x.id);
                    table.ForeignKey(
                        name: "fk_auto_lists_actor_actor_id",
                        column: x => x.actor_id,
                        principalTable: "actor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "post_containers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_post_containers", x => x.id);
                    table.ForeignKey(
                        name: "fk_post_containers_actor_actor_id",
                        column: x => x.actor_id,
                        principalTable: "actor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "auto_list_entry",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    auto_list_id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_of_weeks = table.Column<int>(type: "integer", nullable: false),
                    time_offset = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auto_list_entry", x => x.id);
                    table.ForeignKey(
                        name: "fk_auto_list_entry_auto_lists_auto_list_id",
                        column: x => x.auto_list_id,
                        principalTable: "auto_lists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "instagram_publishing_preset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    share_to_feed = table.Column<bool>(type: "boolean", nullable: false),
                    auto_list_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_instagram_publishing_preset", x => x.id);
                    table.ForeignKey(
                        name: "fk_instagram_publishing_preset_auto_lists_auto_list_id",
                        column: x => x.auto_list_id,
                        principalTable: "auto_lists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "social_media_accounts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_user_id = table.Column<string>(type: "text", nullable: false),
                    access_token = table.Column<string>(type: "text", nullable: false),
                    social_media = table.Column<SocialMedia>(type: "social_media", nullable: false),
                    auto_list_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_media_accounts", x => x.id);
                    table.ForeignKey(
                        name: "fk_social_media_accounts_actor_actor_id",
                        column: x => x.actor_id,
                        principalTable: "actor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_social_media_accounts_auto_lists_auto_list_id",
                        column: x => x.auto_list_id,
                        principalTable: "auto_lists",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_auto_list_entry_auto_list_id",
                table: "auto_list_entry",
                column: "auto_list_id");

            migrationBuilder.CreateIndex(
                name: "ix_auto_lists_actor_id",
                table: "auto_lists",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "ix_instagram_publishing_preset_auto_list_id",
                table: "instagram_publishing_preset",
                column: "auto_list_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_post_containers_actor_id",
                table: "post_containers",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_media_accounts_actor_id",
                table: "social_media_accounts",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_media_accounts_auto_list_id",
                table: "social_media_accounts",
                column: "auto_list_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auto_list_entry");

            migrationBuilder.DropTable(
                name: "instagram_publishing_preset");

            migrationBuilder.DropTable(
                name: "post_containers");

            migrationBuilder.DropTable(
                name: "published_videos");

            migrationBuilder.DropTable(
                name: "social_media_accounts");

            migrationBuilder.DropTable(
                name: "auto_lists");

            migrationBuilder.DropTable(
                name: "actor");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Publisher.Domain.Enums;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "publisher");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:publisher.publication_status", "failed,none,processing,published,scheduled")
                .Annotation("Npgsql:Enum:publisher.social_provider", "instagram,tik_tok,youtube");

            migrationBuilder.CreateTable(
                name: "data_protection_keys",
                schema: "publisher",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    friendly_name = table.Column<string>(type: "text", nullable: true),
                    xml = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_data_protection_keys", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "projects",
                schema: "publisher",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_projects", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "auto_lists",
                schema: "publisher",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_modified = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_modified_by = table.Column<Guid>(type: "uuid", nullable: true),
                    publication_settings = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auto_lists", x => x.id);
                    table.ForeignKey(
                        name: "fk_auto_lists_projects_project_id",
                        column: x => x.project_id,
                        principalSchema: "publisher",
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "social_accounts",
                schema: "publisher",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    username = table.Column<string>(type: "text", nullable: false),
                    provider = table.Column<SocialProvider>(type: "publisher.social_provider", nullable: false),
                    credentials = table.Column<string>(type: "text", nullable: false),
                    token_expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_accounts", x => x.id);
                    table.ForeignKey(
                        name: "fk_social_accounts_projects_project_id",
                        column: x => x.project_id,
                        principalSchema: "publisher",
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "auto_list_entries",
                schema: "publisher",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    auto_list_id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_of_weeks = table.Column<int>(type: "integer", nullable: false),
                    publication_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    created = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_modified = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_modified_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auto_list_entries", x => x.id);
                    table.ForeignKey(
                        name: "fk_auto_list_entries_auto_lists_auto_list_id",
                        column: x => x.auto_list_id,
                        principalSchema: "publisher",
                        principalTable: "auto_lists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "media_posts",
                schema: "publisher",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    media_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    cover_media_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    publication_type = table.Column<int>(type: "integer", nullable: false),
                    auto_list_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_modified = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_modified_by = table.Column<Guid>(type: "uuid", nullable: true),
                    publication_settings = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_media_posts", x => x.id);
                    table.ForeignKey(
                        name: "fk_media_posts_auto_lists_auto_list_id",
                        column: x => x.auto_list_id,
                        principalSchema: "publisher",
                        principalTable: "auto_lists",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_media_posts_projects_project_id",
                        column: x => x.project_id,
                        principalSchema: "publisher",
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "auto_list_social_account",
                schema: "publisher",
                columns: table => new
                {
                    accounts_id = table.Column<Guid>(type: "uuid", nullable: false),
                    auto_lists_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auto_list_social_account", x => new { x.accounts_id, x.auto_lists_id });
                    table.ForeignKey(
                        name: "fk_auto_list_social_account_auto_lists_auto_lists_id",
                        column: x => x.auto_lists_id,
                        principalSchema: "publisher",
                        principalTable: "auto_lists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_auto_list_social_account_social_accounts_accounts_id",
                        column: x => x.accounts_id,
                        principalSchema: "publisher",
                        principalTable: "social_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "publication_records",
                schema: "publisher",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    media_post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    social_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<SocialProvider>(type: "publisher.social_provider", nullable: false),
                    status = table.Column<PublicationStatus>(type: "publisher.publication_status", nullable: false),
                    external_post_id = table.Column<string>(type: "text", nullable: true),
                    public_url = table.Column<string>(type: "text", nullable: true),
                    publication_error_message = table.Column<string>(type: "text", nullable: true),
                    likes_count = table.Column<int>(type: "integer", nullable: false),
                    views_count = table.Column<int>(type: "integer", nullable: false),
                    comments_count = table.Column<int>(type: "integer", nullable: false),
                    shares_count = table.Column<int>(type: "integer", nullable: false),
                    raw_stats_json = table.Column<string>(type: "text", nullable: true),
                    stats_updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_modified = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_modified_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_publication_records", x => x.id);
                    table.ForeignKey(
                        name: "fk_publication_records_media_posts_media_post_id",
                        column: x => x.media_post_id,
                        principalSchema: "publisher",
                        principalTable: "media_posts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_publication_records_social_accounts_social_account_id",
                        column: x => x.social_account_id,
                        principalSchema: "publisher",
                        principalTable: "social_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_auto_list_entries_auto_list_id",
                schema: "publisher",
                table: "auto_list_entries",
                column: "auto_list_id");

            migrationBuilder.CreateIndex(
                name: "ix_auto_list_social_account_auto_lists_id",
                schema: "publisher",
                table: "auto_list_social_account",
                column: "auto_lists_id");

            migrationBuilder.CreateIndex(
                name: "ix_auto_lists_project_id",
                schema: "publisher",
                table: "auto_lists",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_media_posts_auto_list_id",
                schema: "publisher",
                table: "media_posts",
                column: "auto_list_id");

            migrationBuilder.CreateIndex(
                name: "ix_media_posts_project_id",
                schema: "publisher",
                table: "media_posts",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_publication_records_media_post_id",
                schema: "publisher",
                table: "publication_records",
                column: "media_post_id");

            migrationBuilder.CreateIndex(
                name: "ix_publication_records_social_account_id",
                schema: "publisher",
                table: "publication_records",
                column: "social_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_accounts_project_id",
                schema: "publisher",
                table: "social_accounts",
                column: "project_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auto_list_entries",
                schema: "publisher");

            migrationBuilder.DropTable(
                name: "auto_list_social_account",
                schema: "publisher");

            migrationBuilder.DropTable(
                name: "data_protection_keys",
                schema: "publisher");

            migrationBuilder.DropTable(
                name: "publication_records",
                schema: "publisher");

            migrationBuilder.DropTable(
                name: "media_posts",
                schema: "publisher");

            migrationBuilder.DropTable(
                name: "social_accounts",
                schema: "publisher");

            migrationBuilder.DropTable(
                name: "auto_lists",
                schema: "publisher");

            migrationBuilder.DropTable(
                name: "projects",
                schema: "publisher");
        }
    }
}

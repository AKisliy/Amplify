using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Publisher.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPostContainerToAutoList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "post_container_id",
                table: "auto_lists",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "ix_auto_lists_post_container_id",
                table: "auto_lists",
                column: "post_container_id");

            migrationBuilder.AddForeignKey(
                name: "fk_auto_lists_post_containers_post_container_id",
                table: "auto_lists",
                column: "post_container_id",
                principalTable: "post_containers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_auto_lists_post_containers_post_container_id",
                table: "auto_lists");

            migrationBuilder.DropIndex(
                name: "ix_auto_lists_post_container_id",
                table: "auto_lists");

            migrationBuilder.DropColumn(
                name: "post_container_id",
                table: "auto_lists");
        }
    }
}

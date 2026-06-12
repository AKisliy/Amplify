using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UserService.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobAnalyticView : Migration
    {
        private const string TemplateServiceSchema = "template_service";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                $"""
                CREATE OR REPLACE VIEW {ApplicationDbContext.DefaultSchemaName}.job_executions AS
                SELECT
                    j.id                                                            AS job_id,
                    j.status                                                        AS status,
                    j.started_at                                                    AS started_at,
                    j.finished_at                                                   AS finished_at,
                    CASE
                        WHEN j.finished_at IS NOT NULL AND j.started_at IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (j.finished_at - j.started_at))::int
                    END                                                             AS duration_sec,
                    pt.project_id                                                   AS project_id,
                    tv.template_id                                                  AS template_id
                FROM {TemplateServiceSchema}.jobs j
                JOIN {TemplateServiceSchema}.template_versions tv ON tv.id = j.template_version_id
                JOIN {TemplateServiceSchema}.project_templates pt ON pt.id = tv.template_id
                WHERE j.started_at IS NOT NULL;
                """);

            // View 2: node-level execution log — exposes class_name + status per job,
            // joined to project context for per-project filtering.
            migrationBuilder.Sql(
                $"""
                CREATE OR REPLACE VIEW {ApplicationDbContext.DefaultSchemaName}.node_execution_log AS
                SELECT
                    ne.id                                                           AS execution_id,
                    ne.job_id                                                       AS job_id,
                    ne.class_name                                                   AS class_name,
                    ne.status                                                       AS status,
                    pt.project_id                                                   AS project_id,
                    ne.created_at                                                   AS occurred_at
                FROM {TemplateServiceSchema}.node_executions ne
                JOIN {TemplateServiceSchema}.jobs j ON j.id = ne.job_id
                JOIN {TemplateServiceSchema}.template_versions tv ON tv.id = j.template_version_id
                JOIN {TemplateServiceSchema}.project_templates pt ON pt.id = tv.template_id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                $"""
                DROP VIEW IF EXISTS {ApplicationDbContext.DefaultSchemaName}.job_executions;
                """);

            migrationBuilder.Sql(
                $"""
                DROP VIEW IF EXISTS {ApplicationDbContext.DefaultSchemaName}.node_execution_log;
                """);
        }
    }
}

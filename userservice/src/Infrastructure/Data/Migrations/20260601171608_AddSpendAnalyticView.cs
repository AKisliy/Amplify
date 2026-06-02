using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UserService.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpendAnalyticView : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS litellm_spend_project_id_idx
                    ON public."LiteLLM_SpendLogs"
                    ((metadata -> 'spend_logs_metadata' ->> 'project_id'))
                    WHERE metadata -> 'spend_logs_metadata' ->> 'project_id' IS NOT NULL;
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS litellm_spend_template_id_idx
                    ON public."LiteLLM_SpendLogs"
                    ((metadata -> 'spend_logs_metadata' ->> 'template_id'))
                    WHERE metadata -> 'spend_logs_metadata' ->> 'template_id' IS NOT NULL;
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS litellm_spend_job_id_idx
                    ON public."LiteLLM_SpendLogs"
                    ((metadata -> 'spend_logs_metadata' ->> 'job_id'))
                    WHERE metadata -> 'spend_logs_metadata' ->> 'job_id' IS NOT NULL;
                """);

            // View reads project_id / template_id / job_id from spend_logs_metadata,
            // which LiteLLM stores from the spend_logs_metadata field in the request body.
            // Column aliases are snake_case to match EF Core Npgsql naming convention.
            migrationBuilder.Sql(
                $"""
                CREATE OR REPLACE VIEW {ApplicationDbContext.DefaultSchemaName}.generation_spend AS
                SELECT
                    request_id                                                                   AS request_id,
                    "startTime"                                                                  AS occurred_at,
                    (metadata -> 'spend_logs_metadata' ->> 'project_id')::uuid                  AS project_id,
                    (metadata -> 'spend_logs_metadata' ->> 'template_id')::uuid                 AS template_id,
                    (metadata -> 'spend_logs_metadata' ->> 'job_id')::uuid                      AS job_id,
                    model                                                                        AS model,
                    spend                                                                        AS cost_usd,
                    total_tokens                                                                 AS total_tokens,
                    prompt_tokens                                                                AS prompt_tokens,
                    completion_tokens                                                            AS completion_tokens,
                    CASE
                        WHEN "endTime" IS NOT NULL AND "startTime" IS NOT NULL
                        THEN EXTRACT(EPOCH FROM ("endTime" - "startTime"))::int * 1000
                    END                                                                          AS duration_ms,
                    status                                                                       AS status
                FROM public."LiteLLM_SpendLogs"
                WHERE metadata -> 'spend_logs_metadata' ->> 'project_id' IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($"""DROP VIEW IF EXISTS {ApplicationDbContext.DefaultSchemaName}.generation_spend;""");
            migrationBuilder.Sql($"""DROP INDEX IF EXISTS public.litellm_spend_project_id_idx;""");
            migrationBuilder.Sql($"""DROP INDEX IF EXISTS public.litellm_spend_template_id_idx;""");
            migrationBuilder.Sql($"""DROP INDEX IF EXISTS public.litellm_spend_job_id_idx;""");
        }
    }
}

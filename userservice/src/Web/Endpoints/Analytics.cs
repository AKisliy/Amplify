using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Analytics.Queries.GetGenerationVelocity;
using UserService.Application.Analytics.Queries.GetNodeFailureRate;
using UserService.Application.Analytics.Queries.GetOutputVolume;
using UserService.Application.Analytics.Queries.GetSpendByJob;
using UserService.Application.Analytics.Queries.GetSpendByModel;
using UserService.Application.Analytics.Queries.GetSpendByTemplate;
using UserService.Application.Analytics.Queries.GetSpendSummary;
using UserService.Application.Analytics.Queries.GetSpendTrend;
using UserService.Application.Analytics.Queries.Global;

namespace UserService.Web.Endpoints;

public class Analytics : EndpointGroupBase
{
    public override string? GroupName => "analytics";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetSpendSummary,        "{projectId}/spend/summary").RequireAuthorization();
        groupBuilder.MapGet(GetSpendTrend,          "{projectId}/spend/trend").RequireAuthorization();
        groupBuilder.MapGet(GetSpendByModel,        "{projectId}/spend/by-model").RequireAuthorization();
        groupBuilder.MapGet(GetSpendByTemplate,     "{projectId}/spend/by-template").RequireAuthorization();
        groupBuilder.MapGet(GetSpendByJob,          "{projectId}/spend/by-job").RequireAuthorization();
        groupBuilder.MapGet(GetOutputVolume,        "{projectId}/jobs/volume").RequireAuthorization();
        groupBuilder.MapGet(GetGenerationVelocity,  "{projectId}/jobs/velocity").RequireAuthorization();
        groupBuilder.MapGet(GetNodeFailureRate,     "{projectId}/nodes/failure-rate").RequireAuthorization();

        // ── Global (cross-project, user-scoped) ──────────────────────────────
        groupBuilder.MapGet(GetGlobalSpendSummary,  "global/spend/summary").RequireAuthorization();
        groupBuilder.MapGet(GetGlobalSpendTrend,    "global/spend/trend").RequireAuthorization();
        groupBuilder.MapGet(GetGlobalSpendByModel,  "global/spend/by-model").RequireAuthorization();
        groupBuilder.MapGet(GetGlobalOutputVolume,  "global/jobs/volume").RequireAuthorization();
        groupBuilder.MapGet(GetGlobalCapitalBurn,   "global/capital-burn").RequireAuthorization();
        groupBuilder.MapGet(GetEntityEfficiency,    "global/entity-efficiency").RequireAuthorization();
    }

    public async Task<Ok<SpendSummaryDto>> GetSpendSummary(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendSummaryQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<SpendTrendPointDto>>> GetSpendTrend(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendTrendQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<ModelSpendDto>>> GetSpendByModel(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendByModelQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<TemplateSpendDto>>> GetSpendByTemplate(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendByTemplateQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<JobSpendDto>>> GetSpendByJob(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendByJobQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<OutputVolumeDto>>> GetOutputVolume(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetOutputVolumeQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<GenerationVelocityDto>>> GetGenerationVelocity(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetGenerationVelocityQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<NodeFailureRateDto>>> GetNodeFailureRate(
        ISender sender, Guid projectId, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetNodeFailureRateQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    // ── Global endpoints ─────────────────────────────────────────────────────

    public async Task<Ok<SpendSummaryDto>> GetGlobalSpendSummary(
        ISender sender, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetGlobalSpendSummaryQuery(from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<SpendTrendPointDto>>> GetGlobalSpendTrend(
        ISender sender, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetGlobalSpendTrendQuery(from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<ModelSpendDto>>> GetGlobalSpendByModel(
        ISender sender, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetGlobalSpendByModelQuery(from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<OutputVolumeDto>>> GetGlobalOutputVolume(
        ISender sender, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetGlobalOutputVolumeQuery(from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<CapitalBurnPointDto>>> GetGlobalCapitalBurn(
        ISender sender, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetGlobalCapitalBurnQuery(from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<EntityEfficiencyDto>>> GetEntityEfficiency(
        ISender sender, DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetEntityEfficiencyQuery(from, to));
        return TypedResults.Ok(result);
    }
}

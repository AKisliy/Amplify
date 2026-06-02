using Microsoft.AspNetCore.Http.HttpResults;
using UserService.Application.Analytics.Queries.GetSpendByJob;
using UserService.Application.Analytics.Queries.GetSpendByModel;
using UserService.Application.Analytics.Queries.GetSpendByTemplate;
using UserService.Application.Analytics.Queries.GetSpendSummary;
using UserService.Application.Analytics.Queries.GetSpendTrend;

namespace UserService.Web.Endpoints;

public class Analytics : EndpointGroupBase
{
    public override string? GroupName => "analytics";

    public override void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetSpendSummary, "{projectId}/spend/summary").RequireAuthorization();
        groupBuilder.MapGet(GetSpendTrend, "{projectId}/spend/trend").RequireAuthorization();
        groupBuilder.MapGet(GetSpendByModel, "{projectId}/spend/by-model").RequireAuthorization();
        groupBuilder.MapGet(GetSpendByTemplate, "{projectId}/spend/by-template").RequireAuthorization();
        groupBuilder.MapGet(GetSpendByJob, "{projectId}/spend/by-job").RequireAuthorization();
    }

    public async Task<Ok<SpendSummaryDto>> GetSpendSummary(
        ISender sender, Guid projectId,
        DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendSummaryQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<SpendTrendPointDto>>> GetSpendTrend(
        ISender sender, Guid projectId,
        DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendTrendQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<ModelSpendDto>>> GetSpendByModel(
        ISender sender, Guid projectId,
        DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendByModelQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<TemplateSpendDto>>> GetSpendByTemplate(
        ISender sender, Guid projectId,
        DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendByTemplateQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }

    public async Task<Ok<IReadOnlyList<JobSpendDto>>> GetSpendByJob(
        ISender sender, Guid projectId,
        DateOnly from, DateOnly to)
    {
        var result = await sender.Send(new GetSpendByJobQuery(projectId, from, to));
        return TypedResults.Ok(result);
    }
}

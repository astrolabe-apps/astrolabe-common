using Astrolabe.SearchState;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Astrolabe.FormDesigner;

public static class FormDesignerEndpoints
{
    public static RouteGroupBuilder MapFormDesignerEndpoints(
        this IEndpointRouteBuilder endpoints,
        string prefix = "api",
        string? authorizationPolicy = null)
    {
        var group = endpoints.MapGroup(prefix);
        group.AddEndpointFilter<FormsExceptionFilter>();
        if (authorizationPolicy != null)
            group.RequireAuthorization(authorizationPolicy);
        else
            group.RequireAuthorization();

        MapFormEndpoints(group);
        MapTableEndpoints(group);
        MapExportEndpoints(group);
        return group;
    }

    private static void MapFormEndpoints(RouteGroupBuilder group)
    {
        var formGroup = group.MapGroup("form").WithTags("Form");

        formGroup
            .MapPost(
                "search",
                async (IFormDefinitionService svc, [FromBody] SearchOptions request, bool? includeTotal) =>
                    await svc.SearchForms(request, includeTotal ?? false)
            )
            .WithName("SearchForms");

        formGroup
            .MapGet(
                "{formId}/edit",
                async (IFormDefinitionService svc, Guid formId) =>
                    await svc.GetForm(formId)
            )
            .WithName("GetForm");

        formGroup
            .MapPost(
                "",
                async Task<Guid> (IFormDefinitionService svc, [FromBody] FormDefinitionEdit edit) =>
                    await svc.CreateForm(edit)
            )
            .WithName("CreateForm");

        formGroup
            .MapPut(
                "{formId}",
                async Task (IFormDefinitionService svc, Guid formId, [FromBody] FormDefinitionEdit edit) =>
                    await svc.EditForm(formId, edit)
            )
            .WithName("EditForm");

        formGroup
            .MapDelete(
                "{formId}",
                async (IFormDefinitionService svc, Guid formId) =>
                    await svc.DeleteForm(formId)
            )
            .WithName("DeleteForm");
    }

    private static void MapTableEndpoints(RouteGroupBuilder group)
    {
        var tableGroup = group.MapGroup("table").WithTags("Table");

        tableGroup
            .MapPost(
                "search",
                async (ITableDefinitionService svc, [FromBody] SearchOptions request, bool? includeTotal) =>
                    await svc.SearchTables(request, includeTotal ?? false)
            )
            .WithName("SearchTables");

        tableGroup
            .MapGet(
                "{tableId}",
                async (ITableDefinitionService svc, Guid tableId) =>
                    await svc.GetTable(tableId)
            )
            .WithName("GetTable");

        tableGroup
            .MapPost(
                "",
                async Task<Guid> (ITableDefinitionService svc, [FromBody] TableDefinitionEdit edit) =>
                    await svc.CreateTable(edit)
            )
            .WithName("CreateTable");

        tableGroup
            .MapPut(
                "{tableId}",
                async Task (ITableDefinitionService svc, Guid tableId, [FromBody] TableDefinitionEdit edit) =>
                    await svc.EditTable(tableId, edit)
            )
            .WithName("EditTable");

        tableGroup
            .MapDelete(
                "{tableId}",
                async (ITableDefinitionService svc, Guid tableId) =>
                    await svc.DeleteTable(tableId)
            )
            .WithName("DeleteTable");
    }

    private static void MapExportEndpoints(RouteGroupBuilder group)
    {
        var exportGroup = group.MapGroup("export/definition").WithTags("ExportDefinition");

        exportGroup
            .MapPost(
                "search",
                async (IExportDefinitionService svc, [FromBody] SearchOptions request, bool? includeTotal) =>
                    await svc.SearchExportDefinitions(request, includeTotal ?? false)
            )
            .WithName("SearchExportDefinitions");

        exportGroup
            .MapGet(
                "{id:guid}",
                async (IExportDefinitionService svc, Guid id) =>
                    await svc.GetExportDefinition(id)
            )
            .WithName("GetExportDefinition");

        exportGroup
            .MapPost(
                "",
                async Task<Guid> (IExportDefinitionService svc, [FromBody] ExportDefinitionEdit edit) =>
                    await svc.CreateExportDefinition(edit)
            )
            .WithName("CreateExportDefinition");

        exportGroup
            .MapPut(
                "{id:guid}",
                async Task (IExportDefinitionService svc, Guid id, [FromBody] ExportDefinitionEdit edit) =>
                    await svc.EditExportDefinition(id, edit)
            )
            .WithName("EditExportDefinition");

        exportGroup
            .MapDelete(
                "{id:guid}",
                async (IExportDefinitionService svc, Guid id) =>
                    await svc.DeleteExportDefinition(id)
            )
            .WithName("DeleteExportDefinition");
    }
}

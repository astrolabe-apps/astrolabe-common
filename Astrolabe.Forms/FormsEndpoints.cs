using System.Net.Mime;
using System.Security.Claims;
using System.Text;
using Astrolabe.Schemas;
using Astrolabe.Schemas.ExportCsv;
using Astrolabe.SearchState;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Astrolabe.Forms;

public static class FormsEndpoints
{
    public static RouteGroupBuilder MapFormsEndpoints<TContext>(this IEndpointRouteBuilder endpoints)
        where TContext : IFormsContext
    {
        var group = endpoints.MapGroup("api");
        group.AddEndpointFilter<FormsExceptionFilter>();

        MapFormEndpoints<TContext>(group);
        MapTableEndpoints<TContext>(group);
        MapItemEndpoints<TContext>(group);
        MapItemFileEndpoints<TContext>(group);
        MapExportEndpoints<TContext>(group);

        return group;
    }

    private static async Task<FormsUser> GetUser<TContext>(TContext ctx, ClaimsPrincipal principal)
        where TContext : IFormsContext
    {
        return await ctx.ResolveUser(principal);
    }

    private static void MapFormEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var formGroup = group.MapGroup("form").WithTags("Form").RequireAuthorization();

        formGroup.MapGet("", async (TContext ctx, bool? forPublic, bool? published) =>
            await ctx.ListForms(forPublic, published)).WithName("ListForms");

        formGroup.MapGet("{formId}/forRender", async (TContext ctx, Guid formId) =>
            await ctx.GetFormAndSchemas(formId)).AllowAnonymous().WithName("GetFormForRender");

        formGroup.MapDelete("{formId}", async (TContext ctx, Guid formId) =>
            await ctx.DeleteForm(formId)).WithName("DeleteForm");
    }

    private static void MapTableEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var tableGroup = group.MapGroup("table").WithTags("Table").RequireAuthorization();

        tableGroup.MapGet("", async (TContext ctx) =>
            await ctx.ListTables()).WithName("ListTables");

        tableGroup.MapGet("{tableId}", async (TContext ctx, Guid tableId) =>
            await ctx.GetTable(tableId)).WithName("GetTable");

        tableGroup.MapDelete("{tableId}", async (TContext ctx, Guid tableId) =>
            await ctx.DeleteTable(tableId)).WithName("DeleteTable");
    }

    private static void MapItemEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var itemGroup = group.MapGroup("item").WithTags("Item").RequireAuthorization();

        itemGroup.MapPost("search", async (TContext ctx, ClaimsPrincipal principal,
            [FromBody] SearchOptions request, bool? includeTotal) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.SearchItems(request, includeTotal ?? false, user.PersonId);
        }).WithName("SearchItems");

        itemGroup.MapPost("searchadmin", async (TContext ctx, ClaimsPrincipal principal,
            [FromBody] SearchOptions request, bool? includeTotal) =>
        {
            return await ctx.SearchItemsAdmin(request, includeTotal ?? false);
        }).WithName("SearchItemsAdmin");

        itemGroup.MapGet("filterOptions", async (TContext ctx) =>
            await ctx.GetFilterOptions()).WithName("GetFilterOptions");

        itemGroup.MapGet("actions", async (TContext ctx, ClaimsPrincipal principal, Guid id) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.GetUserActions(id, user.PersonId, user.Roles);
        }).WithName("GetUserActions");

        itemGroup.MapGet("admin/{id:guid}", async (TContext ctx, ClaimsPrincipal principal, Guid id) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.GetItemView(id, user.PersonId, user.Roles);
        }).WithName("GetItemView");

        itemGroup.MapGet("{id:guid}", async (TContext ctx, ClaimsPrincipal principal, Guid id) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.GetUserItem(id, user.PersonId, user.Roles);
        }).WithName("GetUserItem");

        itemGroup.MapDelete("{id}", async (TContext ctx, Guid id) =>
            await ctx.DeleteItem(id)).WithName("DeleteItem");

        itemGroup.MapPost("{formType}", async (TContext ctx, ClaimsPrincipal principal,
            Guid formType, [FromBody] ItemEdit edit) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.CreateItem(formType, edit, user.PersonId, user.Roles);
        }).WithName("CreateItem");

        itemGroup.MapPut("{id}", async (TContext ctx, ClaimsPrincipal principal,
            Guid id, [FromBody] ItemEdit edit) =>
        {
            var user = await GetUser(ctx, principal);
            await ctx.EditItem(id, edit, user.PersonId, user.Roles);
        }).WithName("EditItem");

        itemGroup.MapGet("new/{formType}", async (TContext ctx, ClaimsPrincipal principal, Guid formType) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.NewItem(formType, user.PersonId, user.Roles);
        }).WithName("NewItem");

        itemGroup.MapPut("{id}/action", async (TContext ctx, ClaimsPrincipal principal,
            Guid id, [FromBody] string action) =>
        {
            var user = await GetUser(ctx, principal);
            List<ItemAction> actions = [new SimpleWorkflowAction(action)];
            await ctx.PerformActions(actions, id, user.PersonId, user.Roles);
        }).WithName("PerformAction");

        itemGroup.MapPost("note/{itemId:guid}", async (TContext ctx, ClaimsPrincipal principal,
            Guid itemId, [FromBody] ItemNoteEdit noteEdit) =>
        {
            var user = await GetUser(ctx, principal);
            await ctx.AddItemNote(itemId, noteEdit.Message, noteEdit.Internal, user.PersonId);
        }).WithName("AddItemNote");
    }

    private static void MapItemFileEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var fileGroup = group.MapGroup("itemfile").WithTags("ItemFile").RequireAuthorization();

        fileGroup.MapPost("file", async (TContext ctx, ClaimsPrincipal principal,
            Guid? itemId, IFormFile file) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.UploadFile(user.PersonId, itemId, file.OpenReadStream(), file.FileName);
        }).DisableAntiforgery().WithName("UploadFile");

        fileGroup.MapDelete("file/{fileId:guid}", async (TContext ctx, ClaimsPrincipal principal,
            Guid? itemId, Guid fileId) =>
        {
            var user = await GetUser(ctx, principal);
            await ctx.DeleteFile(user.PersonId, itemId, fileId);
        }).WithName("DeleteFile");

        fileGroup.MapGet("file/{fileId:guid}", async (TContext ctx, ClaimsPrincipal principal,
            Guid? itemId, Guid fileId) =>
        {
            var user = await GetUser(ctx, principal);
            var download = await ctx.DownloadFile(user.PersonId, itemId, fileId);
            if (download == null) return Results.NotFound();
            return Results.File(download.Content, download.ContentType, download.FileName);
        }).WithName("GetFile");
    }

    private static void MapExportEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var exportGroup = group.MapGroup("export").WithTags("Export").RequireAuthorization();

        exportGroup.MapGet("definition", async (TContext ctx) =>
            await ctx.ListExportDefinitions()).WithName("ListExportDefinitions");

        exportGroup.MapPost("definition", async (TContext ctx, [FromBody] ExportDefinitionEdit edit) =>
            await ctx.CreateOrUpdateExportDefinition(edit)).WithName("SaveExportDefinition");

        exportGroup.MapGet("definition/{id:guid}", async (TContext ctx, Guid id) =>
            await ctx.GetExportDefinition(id)).WithName("GetExportDefinition");

        exportGroup.MapDelete("definition/{id:guid}", async (TContext ctx, Guid id) =>
            await ctx.DeleteExportDefinition(id)).WithName("DeleteExportDefinition");

        exportGroup.MapPost("definition/ids", async (TContext ctx, ClaimsPrincipal principal,
            [FromBody] ExportRecordsDefinitionEdit data) =>
        {
            var user = await GetUser(ctx, principal);
            var itemIds = data.RecordIds?.ToList() ?? [];
            if (data.All == null && itemIds.Count == 0)
                throw new Exception("Not enough required data");
            if (data.All != null)
                itemIds = await ctx.GetExportableItemIds(data.All);
            return await ctx.GetExportDefinitionOfForms(itemIds);
        }).WithName("GetExportDefinitionOfForms");

        exportGroup.MapPost("", async (TContext ctx, ClaimsPrincipal principal,
            [FromBody] ExportRecordsEdit data) =>
        {
            var user = await GetUser(ctx, principal);
            var itemIds = data.RecordIds?.ToList() ?? [];
            if ((data.All == null && itemIds.Count == 0) || data.DefinitionId == null)
                throw new Exception("Not enough required data");
            if (data.All != null)
                itemIds = await ctx.GetExportableItemIds(data.All);

            var (_, tableDefinitionId, exportName, exportColumns) =
                await ctx.GetExportDefinition(data.DefinitionId);

            var csvText = await ctx.GetCsvText(
                exportColumns, itemIds, tableDefinitionId, user.PersonId, user.Roles);

            var bytes = Encoding.UTF8.GetBytes(csvText ?? "");
            return Results.File(bytes, MediaTypeNames.Text.Csv, $"{exportName}.csv");
        }).WithName("ExportRecord");
    }
}

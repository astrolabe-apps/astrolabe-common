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
        var formGroup = group.MapGroup("form").RequireAuthorization();

        formGroup.MapGet("", async (TContext ctx, bool? forPublic, bool? published) =>
            await ctx.ListForms(forPublic, published));

        formGroup.MapGet("{formId}/forRender", async (TContext ctx, Guid formId) =>
            await ctx.GetFormAndSchemas(formId)).AllowAnonymous();

        formGroup.MapDelete("{formId}", async (TContext ctx, Guid formId) =>
            await ctx.DeleteForm(formId));
    }

    private static void MapTableEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var tableGroup = group.MapGroup("table").RequireAuthorization();

        tableGroup.MapGet("", async (TContext ctx) =>
            await ctx.ListTables());

        tableGroup.MapGet("{tableId}", async (TContext ctx, Guid tableId) =>
            await ctx.GetTable(tableId));

        tableGroup.MapDelete("{tableId}", async (TContext ctx, Guid tableId) =>
            await ctx.DeleteTable(tableId));
    }

    private static void MapItemEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var itemGroup = group.MapGroup("item").RequireAuthorization();

        itemGroup.MapPost("search", async (TContext ctx, ClaimsPrincipal principal,
            [FromBody] SearchOptions request, bool? includeTotal) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.SearchItems(request, includeTotal ?? false, user.PersonId);
        });

        itemGroup.MapPost("searchadmin", async (TContext ctx, ClaimsPrincipal principal,
            [FromBody] SearchOptions request, bool? includeTotal) =>
        {
            return await ctx.SearchItemsAdmin(request, includeTotal ?? false);
        });

        itemGroup.MapGet("filterOptions", async (TContext ctx) =>
            await ctx.GetFilterOptions());

        itemGroup.MapGet("actions", async (TContext ctx, ClaimsPrincipal principal, Guid id) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.GetUserActions(id, user.PersonId, user.Roles);
        });

        itemGroup.MapGet("admin/{id:guid}", async (TContext ctx, ClaimsPrincipal principal, Guid id) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.GetFullItem(id, user.PersonId, user.Roles);
        });

        itemGroup.MapGet("{id:guid}", async (TContext ctx, ClaimsPrincipal principal, Guid id) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.GetUserItem(id, user.PersonId, user.Roles);
        });

        itemGroup.MapDelete("{id}", async (TContext ctx, Guid id) =>
            await ctx.DeleteItem(id));

        itemGroup.MapPost("{formType}", async (TContext ctx, ClaimsPrincipal principal,
            Guid formType, [FromBody] FullEdit edit) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.CreateItem(formType, edit, user.PersonId, user.Roles);
        });

        itemGroup.MapPut("{id}", async (TContext ctx, ClaimsPrincipal principal,
            Guid id, [FromBody] FullEdit edit) =>
        {
            var user = await GetUser(ctx, principal);
            await ctx.EditItem(id, edit, user.PersonId, user.Roles);
        });

        itemGroup.MapGet("new/{formType}", async (TContext ctx, ClaimsPrincipal principal, Guid formType) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.NewItem(formType, user.PersonId, user.Roles);
        });

        itemGroup.MapPut("{id}/action", async (TContext ctx, ClaimsPrincipal principal,
            Guid id, [FromBody] string action) =>
        {
            var user = await GetUser(ctx, principal);
            List<ItemAction> actions = [new SimpleWorkflowAction(action)];
            await ctx.PerformActions(actions, id, user.PersonId, user.Roles);
        });

        itemGroup.MapPost("note/{itemId:guid}", async (TContext ctx, ClaimsPrincipal principal,
            Guid itemId, [FromBody] ItemNoteEdit noteEdit) =>
        {
            var user = await GetUser(ctx, principal);
            await ctx.AddItemNote(itemId, noteEdit.Message, noteEdit.Internal, user.PersonId);
        });
    }

    private static void MapItemFileEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var fileGroup = group.MapGroup("itemfile").RequireAuthorization();

        fileGroup.MapPost("file", async (TContext ctx, ClaimsPrincipal principal,
            Guid? itemId, IFormFile file) =>
        {
            var user = await GetUser(ctx, principal);
            return await ctx.UploadFile(user.PersonId, itemId, file.OpenReadStream(), file.FileName);
        }).DisableAntiforgery();

        fileGroup.MapDelete("file/{fileId:guid}", async (TContext ctx, ClaimsPrincipal principal,
            Guid? itemId, Guid fileId) =>
        {
            var user = await GetUser(ctx, principal);
            await ctx.DeleteFile(user.PersonId, itemId, fileId);
        });

        fileGroup.MapGet("file/{fileId:guid}", async (TContext ctx, ClaimsPrincipal principal,
            Guid? itemId, Guid fileId) =>
        {
            var user = await GetUser(ctx, principal);
            var download = await ctx.DownloadFile(user.PersonId, itemId, fileId);
            if (download == null) return Results.NotFound();
            return Results.File(download.Content, download.ContentType, download.FileName);
        });
    }

    private static void MapExportEndpoints<TContext>(RouteGroupBuilder group)
        where TContext : IFormsContext
    {
        var exportGroup = group.MapGroup("export").RequireAuthorization();

        exportGroup.MapGet("definition", async (TContext ctx) =>
            await ctx.ListExportDefinitions());

        exportGroup.MapPost("definition", async (TContext ctx, [FromBody] ExportDefinitionEdit edit) =>
            await ctx.CreateOrUpdateExportDefinition(edit));

        exportGroup.MapGet("definition/{id:guid}", async (TContext ctx, Guid id) =>
            await ctx.GetExportDefinition(id));

        exportGroup.MapDelete("definition/{id:guid}", async (TContext ctx, Guid id) =>
            await ctx.DeleteExportDefinition(id));

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
        });

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
        });
    }
}

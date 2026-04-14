using System.Net.Mime;
using System.Security.Claims;
using Astrolabe.FormDesigner;
using Astrolabe.Schemas.ExportCsv;
using Astrolabe.SearchState;
using Astrolabe.Web.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Astrolabe.Forms.EF;

public static class FormsEndpoints
{
    public static RouteGroupBuilder MapFormsEndpoints(
        this IEndpointRouteBuilder endpoints,
        string? authorizationPolicy = null
    )
    {
        var group = endpoints.MapGroup("api");
        group.AddEndpointFilter<FormsExceptionFilter>();
        if (authorizationPolicy != null)
            group.RequireAuthorization(authorizationPolicy);
        else
            group.RequireAuthorization();

        MapFormEndpoints(group);
        MapItemEndpoints(group);
        MapItemFileEndpoints(group);
        MapExportEndpoints(group);

        return group;
    }

    private static Task<FormsUser> GetUser(IFormsUserResolver resolver, ClaimsPrincipal principal) =>
        resolver.ResolveUser(principal);

    private static void MapFormEndpoints(RouteGroupBuilder group)
    {
        var formGroup = group.MapGroup("form").WithTags("Form");

        formGroup
            .MapGet(
                "{formId}/forRender",
                async (IFormRenderingService svc, Guid formId) => await svc.GetFormAndSchemas(formId)
            )
            .AllowAnonymous()
            .WithName("GetFormForRender");
    }

    private static void MapItemEndpoints(RouteGroupBuilder group)
    {
        var itemGroup = group.MapGroup("item").WithTags("Item");

        itemGroup
            .MapPost(
                "search",
                async (
                    IItemService items,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    [FromBody] SearchOptions request,
                    bool? includeTotal
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.SearchItems(request, includeTotal ?? false, user.PersonId);
                }
            )
            .WithName("SearchItems");

        itemGroup
            .MapPost(
                "searchadmin",
                async (
                    IItemService items,
                    [FromBody] SearchOptions request,
                    bool? includeTotal
                ) => await items.SearchItemsAdmin(request, includeTotal ?? false)
            )
            .WithName("SearchItemsAdmin");

        itemGroup
            .MapGet("filterOptions", async (IItemService items) => await items.GetFilterOptions())
            .WithName("GetFilterOptions");

        itemGroup
            .MapGet(
                "actions",
                async (
                    IItemService items,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.GetUserActions(id, user.PersonId, user.Roles);
                }
            )
            .WithName("GetUserActions");

        itemGroup
            .MapGet(
                "admin/{id:guid}",
                async (
                    IItemService items,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.GetItemView(id, user.PersonId, user.Roles);
                }
            )
            .WithName("GetItemView");

        itemGroup
            .MapGet(
                "{id:guid}",
                async (
                    IItemService items,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.GetUserItem(id, user.PersonId, user.Roles);
                }
            )
            .WithName("GetUserItem");

        itemGroup
            .MapGet(
                "new/{formType}",
                async (
                    IItemService items,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid formType
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.NewItem(formType, user.PersonId, user.Roles);
                }
            )
            .WithName("NewItem");

        itemGroup
            .MapPost(
                "note/{itemId:guid}",
                async (
                    IItemService items,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid itemId,
                    [FromBody] ItemNoteEdit noteEdit
                ) =>
                {
                    var user = await GetUser(users, principal);
                    await items.AddItemNote(
                        itemId,
                        noteEdit.Message,
                        noteEdit.Internal,
                        user.PersonId
                    );
                }
            )
            .WithName("AddItemNote");
    }

    private static void MapItemFileEndpoints(RouteGroupBuilder group)
    {
        var fileGroup = group.MapGroup("itemfile").WithTags("ItemFile");

        fileGroup
            .MapPost(
                "file",
                async (
                    IItemFileService files,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid? itemId,
                    IFormFile file
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await files.UploadFile(
                        user.PersonId,
                        itemId,
                        file.OpenReadStream(),
                        file.FileName
                    );
                }
            )
            .DisableAntiforgery()
            .WithName("UploadFile");

        fileGroup
            .MapDelete(
                "file/{fileId:guid}",
                async (
                    IItemFileService files,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid? itemId,
                    Guid fileId
                ) =>
                {
                    var user = await GetUser(users, principal);
                    await files.DeleteFile(user.PersonId, itemId, fileId);
                }
            )
            .WithName("DeleteFile");

        fileGroup
            .MapGet(
                "file/{fileId:guid}",
                async (
                    IItemFileService files,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    Guid? itemId,
                    Guid fileId
                ) =>
                {
                    var user = await GetUser(users, principal);
                    var download = await files.DownloadFile(user.PersonId, itemId, fileId);
                    if (download == null)
                        return Results.NotFound();
                    return Results.File(download.Content, download.ContentType, download.FileName);
                }
            )
            .WithName("GetFile");
    }

    private static void MapExportEndpoints(RouteGroupBuilder group)
    {
        var exportGroup = group.MapGroup("export").WithTags("Export");

        exportGroup
            .MapPost(
                "definition/ids",
                async (
                    IItemExportService export,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    [FromBody] ExportRecordsDefinitionEdit data
                ) =>
                {
                    var user = await GetUser(users, principal);
                    var itemIds = data.RecordIds?.ToList() ?? [];
                    if (data.All == null && itemIds.Count == 0)
                        throw new Exception("Not enough required data");
                    if (data.All != null)
                        itemIds = await export.GetExportableItemIds(data.All);
                    return await export.GetExportDefinitionOfForms(itemIds);
                }
            )
            .WithName("GetExportDefinitionOfForms");

        exportGroup
            .MapPost(
                "",
                async (
                    IItemExportService export,
                    IFormsUserResolver users,
                    ClaimsPrincipal principal,
                    IExportDefinitionService exportService,
                    [FromBody] ExportRecordsEdit data
                ) =>
                {
                    var user = await GetUser(users, principal);
                    var itemIds = data.RecordIds?.ToList() ?? [];
                    if ((data.All == null && itemIds.Count == 0) || data.DefinitionId == null)
                        throw new Exception("Not enough required data");
                    if (data.All != null)
                        itemIds = await export.GetExportableItemIds(data.All);

                    var exportDef = await exportService.GetExportDefinition(data.DefinitionId.Value);

                    return new WriteHttpStreamResult(
                        MediaTypeNames.Text.Csv,
                        $"{exportDef.Name}.csv",
                        stream =>
                            export.WriteCsvText(
                                exportDef.ExportColumns.Select(x =>
                                    new Astrolabe.Schemas.ExportCsv.ExportColumn(
                                        x.Field,
                                        x.ColumnName,
                                        x.Expression
                                    )
                                ),
                                itemIds,
                                exportDef.TableDefinitionId,
                                user.PersonId,
                                user.Roles,
                                stream
                            )
                    );
                }
            )
            .Produces<FileResult>(200, contentType: MediaTypeNames.Text.Csv)
            .WithName("ExportRecord");
    }
}

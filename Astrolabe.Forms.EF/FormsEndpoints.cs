using System.Net.Mime;
using System.Security.Claims;
using Astrolabe.FormDesigner;
using Astrolabe.FormItems;
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

        MapItemEndpoints(group);
        MapItemFileEndpoints(group);
        MapExportEndpoints(group);

        return group;
    }

    private static async Task<ItemSecurityContext> GetUser(
        IItemUserResolver resolver,
        ClaimsPrincipal principal
    ) => await resolver.Resolve(principal);

    private static void MapItemEndpoints(RouteGroupBuilder group)
    {
        var itemGroup = group.MapGroup("item").WithTags("Item");

        itemGroup
            .MapPost(
                "search",
                async (
                    IItemService items,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    [FromBody] SearchOptions request,
                    bool? includeTotal
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.SearchItems(request, includeTotal ?? false, user.UserId);
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
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.GetUserActions(id, user.UserId, user.Roles);
                }
            )
            .WithName("GetUserActions");

        itemGroup
            .MapGet(
                "admin/{id:guid}",
                async (
                    IItemService items,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.GetItemView(id, user.UserId, user.Roles);
                }
            )
            .WithName("GetItemView");

        itemGroup
            .MapGet(
                "{id:guid}",
                async (
                    IItemService items,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await items.GetUserItem(id, user.UserId, user.Roles);
                }
            )
            .WithName("GetUserItem");

        itemGroup
            .MapPost(
                "note/{itemId:guid}",
                async (
                    IItemService items,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid itemId,
                    [FromBody] ItemNoteEdit noteEdit
                ) =>
                {
                    var user = await GetUser(users, principal);
                    await items.AddItemNote(itemId, noteEdit.Message, noteEdit.Internal, user.UserId);
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
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid? itemId,
                    IFormFile file
                ) =>
                {
                    var user = await GetUser(users, principal);
                    return await files.UploadFile(
                        user.UserId,
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
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid? itemId,
                    Guid fileId
                ) =>
                {
                    var user = await GetUser(users, principal);
                    await files.DeleteFile(user.UserId, itemId, fileId);
                }
            )
            .WithName("DeleteFile");

        fileGroup
            .MapGet(
                "file/{fileId:guid}",
                async (
                    IItemFileService files,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid? itemId,
                    Guid fileId
                ) =>
                {
                    var user = await GetUser(users, principal);
                    var download = await files.DownloadFile(user.UserId, itemId, fileId);
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
                    IItemUserResolver users,
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
                    IItemUserResolver users,
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
                                user.UserId,
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

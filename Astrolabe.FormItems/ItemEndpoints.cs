using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Astrolabe.FormItems;

public static class ItemEndpoints
{
    public const string SubmitWorkflowAction = "Submit";

    /// <summary>
    /// Maps the three CRUD endpoints:
    /// <code>
    ///   POST   /api/item/{formType}         body: JsonElement metadata → returns Guid
    ///   PUT    /api/item/{id}?submit=true   body: JsonElement metadata
    ///   DELETE /api/item/{id}
    /// </code>
    /// </summary>
    public static RouteGroupBuilder MapItemEndpoints(
        this IEndpointRouteBuilder endpoints,
        string? authorizationPolicy = null
    )
    {
        var group = endpoints.MapGroup("api/item").WithTags("Item");
        if (authorizationPolicy != null)
            group.RequireAuthorization(authorizationPolicy);
        else
            group.RequireAuthorization();

        group
            .MapPost(
                "{formType:guid}",
                async (
                    IItemActionService svc,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid formType,
                    [FromBody] JsonElement metadata
                ) =>
                {
                    var security = await users.Resolve(principal);
                    var actions = new List<IItemAction>
                    {
                        new CreateItemAction(formType),
                        new EditMetadataAction(metadata),
                    };
                    var ids = await svc.PerformActions([null], actions, security);
                    return ids[0];
                }
            )
            .WithName("CreateItem");

        group
            .MapPut(
                "{id:guid}",
                async (
                    IItemActionService svc,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id,
                    [FromBody] JsonElement metadata,
                    bool? submit
                ) =>
                {
                    var security = await users.Resolve(principal);
                    var actions = new List<IItemAction> { new EditMetadataAction(metadata) };
                    if (submit == true)
                        actions.Add(new SimpleWorkflowAction(SubmitWorkflowAction));
                    await svc.PerformActions([id], actions, security);
                }
            )
            .WithName("EditItem");

        group
            .MapDelete(
                "{id:guid}",
                async (
                    IItemActionService svc,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var security = await users.Resolve(principal);
                    await svc.PerformActions([id], [new DeleteItemAction()], security);
                }
            )
            .WithName("DeleteItem");

        group
            .MapGet(
                "new/{formDefinitionId:guid}",
                async (
                    IItemFormService svc,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid formDefinitionId
                ) =>
                {
                    var security = await users.Resolve(principal);
                    return await svc.NewItemForm(formDefinitionId, security);
                }
            )
            .WithName("NewItemForm");

        group
            .MapGet(
                "{id:guid}/form",
                async (
                    IItemFormService svc,
                    IItemUserResolver users,
                    ClaimsPrincipal principal,
                    Guid id
                ) =>
                {
                    var security = await users.Resolve(principal);
                    return await svc.GetItemForm(id, security);
                }
            )
            .WithName("GetItemForm");

        return group;
    }
}

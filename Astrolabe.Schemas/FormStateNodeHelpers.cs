using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Helper methods for building form state node trees
/// </summary>
public static class FormStateNodeHelpers
{
    /// <summary>
    /// Looks up the data node for a control definition within a parent data context.
    /// Ported from TypeScript formNode.ts lookupDataNode function.
    /// </summary>
    public static SchemaDataNode? LookupDataNode(
        ControlDefinition definition,
        SchemaDataNode parentNode
    )
    {
        var fieldRef = definition.GetControlFieldRef();
        if (fieldRef == null)
            return null;

        // "." means current node
        if (fieldRef == ".")
            return parentNode;

        var fieldPath = fieldRef.Split('/');
        return parentNode.GetChildForFieldPath(fieldPath);
    }

    /// <summary>
    /// Resolves array children for a collection data node.
    /// Ported from TypeScript resolveChildren.ts resolveArrayChildren function.
    /// </summary>
    public static IEnumerable<ChildNodeSpec> ResolveArrayChildren(
        SchemaDataNode dataNode,
        IFormNode formNode,
        ChangeTracker tracker
    )
    {
        var childNodes = formNode.GetChildNodes().ToList();
        var childCount = childNodes.Count;
        var singleChild = childCount == 1 ? childNodes[0] : null;

        if (!dataNode.Control.IsArray)
            yield break;

        var elements = tracker.TrackElements(dataNode.Control);

        for (var i = 0; i < elements.Count; i++)
        {
            var element = elements[i];
            var elementDataNode = dataNode.GetChildElement(i);

            ChildNodeSpec CreateSpec()
            {
                // No children: create default data control for "." field
                if (childCount == 0)
                {
                    return new ChildNodeSpec(
                        ChildKey: element.UniqueId,
                        Definition: new DataControlDefinition(".")
                        {
                            HideTitle = true,
                            RenderOptions = new SimpleRenderOptions(nameof(DataRenderType.Standard))
                        },
                        Parent: elementDataNode,
                        Node: formNode
                    );
                }

                // Single child: use that child's definition
                if (singleChild != null)
                {
                    return new ChildNodeSpec(
                        ChildKey: element.UniqueId,
                        Definition: singleChild.Definition,
                        Parent: elementDataNode,
                        Node: singleChild
                    );
                }

                // Multiple children: use grouped control (empty children)
                return new ChildNodeSpec(
                    ChildKey: element.UniqueId,
                    Definition: GroupedControlsDefinition.Default,
                    Parent: elementDataNode,
                    Node: formNode
                );
            }

            yield return CreateSpec();
        }
    }

    /// <summary>
    /// Resolves children for a form state node.
    /// Ported from TypeScript resolveChildren.ts defaultResolveChildNodes function.
    /// </summary>
    public static IEnumerable<ChildNodeSpec> ResolveChildren(
        IFormStateNode formStateNode,
        ChangeTracker tracker
    )
    {
        var form = formStateNode.Form;
        var parent = formStateNode.Parent;
        var dataNode = formStateNode.DataNode;

        if (form == null)
            yield break;

        var definition = form.Definition;

        // Check for CheckList/Radio rendering with field options
        if (definition is DataControlDefinition dataControl)
        {
            if (dataNode == null)
                yield break;

            var renderType = dataControl.RenderOptions?.Type;
            if (
                renderType == nameof(DataRenderType.CheckList)
                || renderType == nameof(DataRenderType.Radio)
            )
            {
                var childNodes = form.GetChildNodes().ToList();
                var fieldOptions = dataNode.Schema.Field.Options?.ToList();

                if (childNodes.Count > 0 && fieldOptions != null && fieldOptions.Count > 0)
                {
                    foreach (var option in fieldOptions)
                    {
                        yield return new ChildNodeSpec(
                            ChildKey: option.Value?.ToString() ?? "",
                            Definition: new GroupedControlsDefinition
                            {
                                GroupOptions = new SimpleGroupRenderOptions(
                                    nameof(GroupRenderType.Contents)
                                )
                            },
                            Parent: parent,
                            Node: form
                        );
                    }
                    yield break;
                }
            }

            // Check for array/collection handling
            if (dataNode.Schema.Field.Collection == true && dataNode.ElementIndex == null)
            {
                foreach (var child in ResolveArrayChildren(dataNode, form, tracker))
                {
                    yield return child;
                }
                yield break;
            }
        }

        // Standard children: create children from form node's child nodes
        foreach (var childNode in form.GetChildNodes())
        {
            yield return new ChildNodeSpec(
                ChildKey: childNode.Definition.Id ?? childNode.GetHashCode().ToString(),
                Definition: childNode.Definition,
                Parent: dataNode ?? parent,
                Node: childNode
            );
        }
    }

    /// <summary>
    /// Checks if a data node is in a valid state for display.
    /// A data node is valid if its control is not undefined.
    /// </summary>
    public static bool ValidDataNode(SchemaDataNode node)
    {
        return !node.Control.IsUndefined;
    }

    /// <summary>
    /// Checks if a display-only control should be hidden when its data is empty.
    /// Display-only controls are hidden when:
    /// 1. The definition has DisplayOnly render options
    /// 2. EmptyText is not specified (null/empty)
    /// 3. The control's value is considered empty by the schema interface
    /// Ported from TypeScript hideDisplayOnly in schemaDataNode.ts:177-188
    /// </summary>
    public static bool HideDisplayOnly(
        SchemaDataNode node,
        ControlDefinition definition,
        ISchemaInterface schemaInterface)
    {
        var displayOptions = GetDisplayOnlyOptions(definition);
        return displayOptions != null &&
               string.IsNullOrEmpty(displayOptions.EmptyText) &&
               schemaInterface.IsEmptyValue(node.Schema.Field, node.Control.ValueObject);
    }

    /// <summary>
    /// Extracts DisplayOnlyRenderOptions from a control definition if it's a data control with display-only rendering.
    /// Ported from TypeScript getDisplayOnlyOptions in controlDefinition.ts:726-734
    /// </summary>
    public static DisplayOnlyRenderOptions? GetDisplayOnlyOptions(ControlDefinition definition)
    {
        return definition is DataControlDefinition { RenderOptions: DisplayOnlyRenderOptions displayOptions }
            ? displayOptions
            : null;
    }
}

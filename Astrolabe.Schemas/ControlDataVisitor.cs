using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Astrolabe.JSON;
using Astrolabe.Controls;

namespace Astrolabe.Schemas;

public enum VisitorResult
{
    Continue,
    Skip,
    Stop
}

public delegate VisitorResult DataVisitor<in TField>(DataControlDefinition dataControl, IControl data,
    TField field,
    ControlDataVisitorContext context);

public record ControlDataVisitor(
    DataVisitor<SimpleSchemaField>? Data = null,
    DataVisitor<SimpleSchemaField>? DataCollection = null,
    DataVisitor<CompoundField>? Compound = null,
    DataVisitor<CompoundField>? CompoundCollection = null,
    DataVisitor<SchemaField>? AnyData = null,
    Func<ControlDefinition, IControl, SchemaField, ControlDataVisitorContext, VisitorResult>? Other = null
);

public record ControlDataVisitorContext(
    ControlDefinition Control,
    SchemaField Field,
    bool Element,
    IControl Data,
    JsonPathSegments Path,
    ControlDataVisitorContext? Parent)
{
    public static ControlDataVisitorContext RootContext(IEnumerable<ControlDefinition> controls,
        IEnumerable<SchemaField> fields, IControl data)
    {
        return new ControlDataVisitorContext(new GroupedControlsDefinition { Children = controls },
            new CompoundField("", fields, false), false, data, JsonPathSegments.Empty, null);
    }

    public ControlDataVisitorContext ChildContext(ControlDefinition childDef)
    {
        return this with { Control = childDef, Element = false, Parent = this };
    }

    public ControlDataVisitorContext? FindParent(Func<ControlDataVisitorContext, bool> matching)
    {
        var currentParent = Parent;
        while (currentParent != null)
        {
            if (matching(currentParent))
                return currentParent;
            currentParent = currentParent.Parent;
        }
        return null;
    }
}

public static class ControlDataVisitorExtensions
{
    public static VisitorResult Visit(this ControlDataVisitorContext context, ControlDataVisitor visitor)
    {
        var visitChildren = (context.Control, context.Field, context.Data) switch
        {
            (DataControlDefinition dcd, SimpleSchemaField { Collection: not true } ssf, var value) when visitor is
                { Data: { } df } => df(dcd, value, ssf, context),
            (DataControlDefinition dcd, SimpleSchemaField { Collection: true } ssf, var value) when
                !context.Element && value.IsArray && visitor is
                    { DataCollection: { } df } => df(dcd, value, ssf, context),
            (DataControlDefinition dcd, CompoundField { Collection: not true } compField, var value) when
                value.IsObject && visitor is
                { Compound: { } df } => df(dcd, value, compField, context),
            (DataControlDefinition dcd, CompoundField { Collection: true } compCollField, var value) when
                !context.Element && value.IsArray && visitor is
                    { CompoundCollection: { } df } => df(dcd, value, compCollField, context),
            (DataControlDefinition dcd, _, _) when visitor is
                { AnyData: { } df } => df(dcd, context.Data, context.Field, context),
            var (c, f, d) when visitor is { Other: { } df } => df(c, d, f, context),
            _ => VisitorResult.Continue
        };
        if (visitChildren is VisitorResult.Stop or VisitorResult.Skip)
            return visitChildren;
        if ((context.Field.Collection ?? false) && !context.Element)
        {
            if (!context.Data.IsArray) return VisitorResult.Continue;

            for (var i = 0; i < context.Data.Count; i++)
            {
                var childControl = context.Data[i];
                if (childControl == null) continue;

                var childContext = context with
                {
                    Element = true, Data = childControl, Parent = context, Path = context.Path.Index(i)
                };
                if (childContext.Visit(visitor) == VisitorResult.Stop)
                    return VisitorResult.Stop;
            }

            return VisitorResult.Continue;
        }

        var childControls = context.Control.Children ?? Array.Empty<ControlDefinition>();
        if (context is not { Field: CompoundField cf, Data: var data } || !data.IsObject)
        {
            return childControls.Any(childControl =>
                context.ChildContext(childControl).Visit(visitor) == VisitorResult.Stop)
                ? VisitorResult.Stop
                : VisitorResult.Continue;
        }

        foreach (var childControl in childControls)
        {
            var childContext = childControl.FindChildField(data, cf.Children) is var (childData, childField)
                ? new ControlDataVisitorContext(childControl, childField, false,
                    childData, context.Path.Field(childField.Field), context)
                : context.ChildContext(childControl);
            if (childContext.Visit(visitor) == VisitorResult.Stop)
                return VisitorResult.Stop;
        }

        return VisitorResult.Continue;
    }
}
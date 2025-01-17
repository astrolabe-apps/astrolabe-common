using System.Linq.Expressions;
using System.Text.Json.Nodes;
using Astrolabe.Common;
using Astrolabe.JSON;

namespace Astrolabe.Patch;

public abstract class PatchColumns<TJson, TDb, TContext>
{
    private readonly List<PatchColumn<TDb, TContext>> _columns = new();

    protected void Add<T>(
        Expression<Func<TJson, T>> expression,
        Action<TDb, JsonNode, TContext> action
    )
    {
        _columns.Add(
            new PatchColumn<TDb, TContext>(expression.GetPropertyInfo().GetJsonName(), action)
        );
    }

    protected void Add<T>(Expression<Func<TJson, T>> expression, Action<TDb, JsonNode> action)
    {
        _columns.Add(
            new PatchColumn<TDb, TContext>(
                expression.GetPropertyInfo().GetJsonName(),
                (db, node, _) => action(db, node)
            )
        );
    }

    public void RunPatch(JsonNode json, TDb dbObject, TContext context)
    {
        foreach (var col in _columns)
        {
            if (json.AsObject().ContainsKey(col.PathName))
            {
                var node = json.AsObject()[col.PathName];
                col.Action(dbObject, node, context);
            }
        }
    }

    protected void PatchCollection<T>(
        JsonNode jsonNode,
        List<T> existing,
        Func<JsonNode?, T, bool> edit,
        Func<JsonNode?, T> newEntity,
        Action<ListEditResults<T>> action,
        (string, Func<T, JsonNode, bool>)? matchId = null
    )
    {
        var results = ListEditor.EditList(
            existing,
            jsonNode.AsArray().ToList(),
            matchId != null
                ? (s, d) =>
                {
                    var (idField, matcher) = matchId.Value;
                    var idValue = s!.AsObject()[idField];
                    return idValue != null && matcher(d, idValue);
                }
                : (s, d) =>
                    s!.AsObject().ContainsKey("old")
                    && (int)s.AsObject()["old"] == existing.FindIndex(x => ReferenceEquals(x, d)),
            edit,
            newEntity
        );
        action(results);
    }
}

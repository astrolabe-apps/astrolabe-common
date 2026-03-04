using Astrolabe.Workflow;

namespace Astrolabe.Forms;

public delegate Task<IFormRuleContext> TypedFormRuleAction<T>(
    IFormRuleContext context,
    IEditingContext<FormRuleData<T>> form
);

public abstract class FormMetadataRules<T>
    where T : class
{
    public static FormRule Index<TValue>(
        Func<T, TValue> get,
        Action<ItemIndexDocument, TValue> edit
    )
    {
        return ActionWhen(
            (c, e) =>
            {
                return Task.FromResult(
                    c.AddIndexer(
                        doc => edit(doc, get((T)e.Edited.FormData)),
                        e.Changed
                    )
                );
            },
            _ => true
        );
    }

    public static FormRule ActionWhen(
        TypedFormRuleAction<T> action,
        Func<IEditingContext<FormRuleData<T>>, bool> when
    )
    {
        return WorkflowRules.ActionWhen<
            FormRuleAction,
            IEditingContext<FormRuleData<object>>
        >(
            (i, o) => action(i, o.Map(x => new FormRuleData<T>((T)x.FormData, x.New, x.Load))),
            c =>
                c.Edited.FormData as T is { } ec
                && when(c.Map(x => new FormRuleData<T>(ec, x.New, x.Load)))
        );
    }

    public static FormRule SetupForm(
        Func<T, IFormRuleContext, Task<T>> setupData,
        bool onLoad = true,
        bool onNew = false
    )
    {
        return ActionWhen(
            async (ctx, iec) =>
            {
                var formData = (T)iec.Edited.FormData;
                var newData = await setupData(formData, ctx);
                return !ReferenceEquals(newData, formData)
                    ? ctx.SetMetadata(newData, true)
                    : ctx;
            },
            iec => (onLoad && iec.Edited.Load) || (onNew && iec.Edited.New)
        );
    }
}

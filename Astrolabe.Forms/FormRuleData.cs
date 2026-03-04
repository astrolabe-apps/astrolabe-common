using Astrolabe.Workflow;

namespace Astrolabe.Forms;

public record FormRuleData<T>(T FormData, bool New, bool Load);

public static class FormRuleData
{
    public static FormRuleData<object> From<TContext>(object o, TContext iec)
        where TContext : IItemWorkflowContext, IFormEditContextInfo
    {
        return new FormRuleData<object>(o, iec.New, iec.Load);
    }
}

public interface IFormEditContextInfo
{
    bool New { get; }
    bool Load { get; }
}

global using CarWorkflowRule = Astrolabe.Workflow.IWorkflowRule<
    Astrolabe.TestTemplate.Workflow.CarWorkflow,
    Astrolabe.TestTemplate.Workflow.ICarWorkflowContext
>;
using static Astrolabe.Workflow.WorkflowRules;

namespace Astrolabe.TestTemplate.Workflow;

public interface ICarWorkflowContext
{
    public ItemStatus Status { get; }
}

public class CarWorkflowRules
{
    public static CarWorkflowRule ActionWhenStatus(CarWorkflow workflow, ItemStatus status)
    {
        return ActionWhen<CarWorkflow, ICarWorkflowContext>(workflow, x => x.Status == status);
    }

    public static IEnumerable<CarWorkflowRule> Rules =
    [
        ActionWhenStatus(CarWorkflow.Publish, ItemStatus.Draft),
        ActionWhenStatus(CarWorkflow.Embarrassed, ItemStatus.Published),
    ];
}

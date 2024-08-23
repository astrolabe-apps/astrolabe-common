using Astrolabe.Annotation;
using Astrolabe.TestTemplate.Controllers;
using Astrolabe.Workflow;

namespace Astrolabe.TestTemplate.Workflow;

public interface CarAction;

public record EditCarAction(CarEdit CarEdit) : CarAction;

public record WorkflowAction(CarWorkflow CarWorkflow) : CarAction;

[JsonString]
public enum CarWorkflow
{
    Publish,
    Embarrassed
}

public record CarContext(AppDbContext DbContext, CarItem CarItem, IEnumerable<CarAction> Actions)
    : IWorkflowActionList<CarContext, CarAction>,
        ICarWorkflowContext
{
    public (ICollection<CarAction>, CarContext) NextActions()
    {
        return (Actions.ToList(), this with { Actions = [] });
    }

    public ItemStatus Status => CarItem.Status;
}

public record LoadCarContext(
    AppDbContext DbContext,
    IEnumerable<Guid> CarIds,
    IEnumerable<CarAction> Actions,
    string Owner
);

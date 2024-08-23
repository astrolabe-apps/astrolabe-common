using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.TestTemplate.Workflow;

public class CarWorkflowExecutor : AbstractWorkflowExecutor<CarContext, LoadCarContext, CarAction>
{
    public override async Task<IEnumerable<CarContext>> LoadData(LoadCarContext loadContext)
    {
        var carIds = loadContext.CarIds.ToList();
        var dbContext = loadContext.DbContext;
        if (carIds.Count == 0)
        {
            var carItem = new CarItem { Status = ItemStatus.Draft, Owner = loadContext.Owner };
            dbContext.Cars.Add(carItem);
            return [new CarContext(dbContext, carItem, loadContext.Actions)];
        }

        var cars = await dbContext.Cars.Where(x => carIds.Contains(x.Id)).ToListAsync();
        return cars.Select(x => new CarContext(dbContext, x, loadContext.Actions));
    }

    public override async Task<CarContext> PerformAction(CarContext context, CarAction action)
    {
        var car = context.CarItem;

        return action switch
        {
            EditCarAction editCarAction => await DoEdit(editCarAction),
            WorkflowAction { CarWorkflow: var workflow } => DoWorkflow(workflow),
            _ => throw new ArgumentOutOfRangeException(nameof(action))
        };

        CarContext DoWorkflow(CarWorkflow workflowAction)
        {
            var matcher = CarWorkflowRules.Rules.RuleMatcher();
            if (!matcher(context, workflowAction))
                throw new Exception("PLS DONT");
            car.Status = workflowAction switch
            {
                CarWorkflow.Publish => ItemStatus.Published,
                CarWorkflow.Embarrassed => ItemStatus.Draft,
                _
                    => throw new ArgumentOutOfRangeException(
                        nameof(workflowAction),
                        workflowAction,
                        null
                    )
            };
            return context;
        }

        async Task<CarContext> DoEdit(EditCarAction editCarAction)
        {
            var edit = editCarAction.CarEdit;
            car.Make = edit.Make;
            car.Model = edit.Model;
            car.Year = edit.Year;
            return context;
        }
    }
}

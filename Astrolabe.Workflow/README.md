# Astrolabe.Workflow

This library provides abstractions for implementing various tasks which fall under the umbrella of "workflow":

* Declarative rule based triggering of actions - e.g. automated sending emails
* Declarative security for user triggered actions - e.g. provide lists of allowed user triggerable actions and secure them if triggered by the user.
* Encourages efficient bulk operations

## The workflow executor

A workflow executor instance is responsible for:

* Loading data (possibly in bulk)
* Check rule based triggers and queue up actions
* Apply the actions which have been user triggered or automatically queued.

The class `AbstractWorkflowExecutor<TContext, TLoadContext, TAction>` provides a good base for implementing a 
workflow executor given the 3 type parameters with the following meanings. 

### TContext

This type needs to carry all the data required for editing a single entity along with any associated entities, 
e.g. Audit Logs. 

### TAction

A class which describes all the actions which can be performed, including their parameters if required.

### TLoadContext

This class should contain the data required to do a bulk load of data into `TContext` instances. 
Usually this is at least a list of id's for the entities to load.

## Workflow Rules

TODO

## Example

Let's take the contrived example of an app for allowing users to enter the make, model and year of 
their cars, with draft mode in case you don't want to share your embarrassment with others: (e.g. Hyundai, Accent, 2002).

The database could be mapped by an EF model like this:

```csharp 
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.TestTemplate.Workflow;

public class CarItem
{
    public Guid Id { get; set; }

    public string Owner { get; set; }

    public ItemStatus Status { get; set; }

    /* Editable by the user */

    public string Make { get; set; }

    public string Model { get; set; }

    public int Year { get; set; }
}

public enum ItemStatus
{
    Draft,
    Published,
}

public class AppDbContext : DbContext
{
    public DbSet<CarItem> Cars { get; set; }
}
```

and the controller could look like this:

```csharp
using Microsoft.AspNetCore.Mvc;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CarController : ControllerBase
{
    [HttpPost]
    public async Task<Guid> Create([FromBody] CarEdit edit)
    {
        throw new NotImplementedException();
    }

    [HttpPut("{id}")]
    public async Task Edit(Guid id, [FromBody] CarEdit edit)
    {
        throw new NotImplementedException();
    }

    [HttpGet]
    public async Task<IEnumerable<CarEdit>> ListPublished()
    {
        throw new NotImplementedException();
    }
}

public record CarEdit(string Make, string Model, int Year);
```


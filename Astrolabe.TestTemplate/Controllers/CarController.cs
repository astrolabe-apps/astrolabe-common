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

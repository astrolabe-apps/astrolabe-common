using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.TestTemplate.Controllers;

namespace Astrolabe.TestTemplate.Service;

public class CarService
{
    public ISchemaTreeLookup SchemaLookup { get; }

    public CarService()
    {
        var schemas = new SchemaFieldsInstanceGenerator(
            new SchemaFieldsGeneratorOptions("")
        ).CollectDataForTypes(typeof(CarInfo));
        SchemaLookup = SchemaTreeLookup.Create(
            schemas.ToDictionary(x => x.Type.Name, x => x.Fields)
        );
    }
}

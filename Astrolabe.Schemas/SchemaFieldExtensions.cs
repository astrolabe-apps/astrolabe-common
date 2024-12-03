namespace Astrolabe.Schemas;

public static class SchemaFieldExtensions
{
    public static string Title(this SchemaField field)
    {
        return field.DisplayName ?? field.Field;
    }

    public static bool IsScalarField(this SchemaField field)
    {
        return !(field.Collection is true || field is CompoundField);
    }
}

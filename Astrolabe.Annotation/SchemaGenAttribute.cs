namespace Astrolabe.Annotation;

[AttributeUsage(AttributeTargets.Class)]
public class SchemaGenAttribute : Attribute
{
    public string? FormName { get; }
    
    public bool? ApiClass { get; }

    public SchemaGenAttribute(string? formName = null, bool apiClass = true)
    {
        FormName = formName;
        ApiClass = apiClass;
    }

    public SchemaGenAttribute(bool apiClass = true) : this(null, apiClass) {}

    public SchemaGenAttribute(string? formName = null)
    {
        FormName = formName;
        ApiClass = null;
    }

}
namespace Astrolabe.Forms;

public interface IFormData
{
    Guid Id { get; set; }
    Guid CreatorId { get; set; }
    string Data { get; set; }
    Guid Type { get; set; }
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}

public interface IFormDataEntity<TPerson, TFormDef> : IFormData
    where TPerson : class, IPerson
    where TFormDef : class
{
    TPerson Creator { get; set; }
    TFormDef Definition { get; set; }
}

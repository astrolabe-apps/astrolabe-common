namespace Astrolabe.Forms;

public interface IFormData<TPerson, TFormDef>
    where TPerson : class, IPerson
    where TFormDef : class
{
    Guid Id { get; set; }
    Guid CreatorId { get; set; }
    string Data { get; set; }
    Guid Type { get; set; }
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }

    TPerson Creator { get; set; }
    TFormDef Definition { get; set; }
}

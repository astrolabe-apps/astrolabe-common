namespace Astrolabe.Forms;

public interface IItemNote<TPerson>
    where TPerson : class, IPerson
{
    Guid Id { get; set; }
    string Message { get; set; }
    Guid? PersonId { get; set; }
    Guid ItemId { get; set; }
    DateTime Timestamp { get; set; }
    bool Internal { get; set; }

    TPerson Person { get; set; }
}

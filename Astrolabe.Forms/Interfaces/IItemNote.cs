namespace Astrolabe.Forms;

public interface IItemNote
{
    Guid Id { get; set; }
    string Message { get; set; }
    Guid? PersonId { get; set; }
    Guid ItemId { get; set; }
    DateTime Timestamp { get; set; }
    bool Internal { get; set; }
}

public interface IItemNoteEntity<TPerson> : IItemNote
    where TPerson : class, IPerson
{
    TPerson Person { get; set; }
}

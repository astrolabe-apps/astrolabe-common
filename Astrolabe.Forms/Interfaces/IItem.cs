namespace Astrolabe.Forms;

public interface IItem
{
    Guid Id { get; set; }
    Guid FormDataId { get; set; }
    Guid PersonId { get; set; }
    string SearchText { get; set; }
    string Status { get; set; }
    DateTime CreatedAt { get; set; }
    DateTime? SubmittedAt { get; set; }
}

public interface IItemEntity<TPerson, TFormData, TItemTag, TItemNote> : IItem
    where TPerson : class, IPerson
    where TFormData : class
    where TItemTag : class, IItemTag
    where TItemNote : class
{
    TPerson Person { get; set; }
    TFormData FormData { get; set; }
    IList<TItemTag> Tags { get; set; }
    IList<TItemNote> Notes { get; set; }
}
